import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import { execSync } from "child_process";

interface LambdaStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  bucket: s3.Bucket;
  tags?: Record<string, string>;
}

/** Build a single handler with esbuild locally (no Docker required). */
function localBundle(
  entryFile: string,
  backendPath: string,
  includePrompts = false
): lambda.AssetCode {
  const outFile = entryFile.replace(".ts", ".js");
  return lambda.Code.fromAsset(backendPath, {
    bundling: {
      local: {
        tryBundle(outputDir: string) {
          try {
            const fs = require("fs") as typeof import("fs");
            // Ensure output subdirectory exists
            fs.mkdirSync(path.join(outputDir, "handlers"), { recursive: true });
            // Bundle with esbuild
            execSync(
              `npx esbuild ${entryFile} --bundle --platform=node --target=node20 --outfile="${path.join(outputDir, outFile)}" --external:@aws-sdk/*`,
              { cwd: backendPath, stdio: "inherit" }
            );
            // Copy prompts directory so fs.readFileSync works at runtime
            if (includePrompts) {
              fs.cpSync(
                path.join(backendPath, "prompts"),
                path.join(outputDir, "prompts"),
                { recursive: true }
              );
            }
            return true;
          } catch {
            return false;
          }
        },
      },
      // Docker fallback
      image: lambda.Runtime.NODEJS_20_X.bundlingImage,
      command: [
        "bash", "-c",
        `npm ci && npx esbuild ${entryFile} --bundle --platform=node --target=node20 --outfile=/asset-output/${outFile} --external:@aws-sdk/*${includePrompts ? " && cp -r prompts /asset-output/prompts" : ""}`,
      ],
    },
  });
}

interface LambdaStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  bucket: s3.Bucket;
  tags?: Record<string, string>;
}

export class LambdaStack extends cdk.Stack {
  public readonly sessionFn: lambda.Function;
  public readonly orchestratorFn: lambda.Function;
  public readonly bedrockFn: lambda.Function;
  public readonly wsHandlerFn: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    if (props.tags) {
      for (const [k, v] of Object.entries(props.tags)) {
        cdk.Tags.of(this).add(k, v);
      }
    }

    const stage = this.node.tryGetContext("stage") ?? "dev";
    const backendPath = path.resolve(__dirname, "..", "..", "council-backend");

    const commonEnv = {
      NODE_ENV: stage as string,
      SESSIONS_TABLE: props.table.tableName,
      DEBATES_BUCKET: props.bucket.bucketName,
    };

    const commonProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
    } as const;

    // ── Session Manager ─────────────────────────────────────────────────
    this.sessionFn = new lambda.Function(this, "SessionFn", {
      ...commonProps,
      functionName: `council-session-${stage}`,
      handler: "handlers/session.handler",
      code: localBundle("handlers/session.ts", backendPath),
      environment: commonEnv,
    });

    // ── Orchestrator ────────────────────────────────────────────────────
    this.orchestratorFn = new lambda.Function(this, "OrchestratorFn", {
      ...commonProps,
      functionName: `council-orchestrator-${stage}`,
      handler: "handlers/orchestrator.handler",
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      code: localBundle("handlers/orchestrator.ts", backendPath, true),
      environment: {
        ...commonEnv,
        BEDROCK_FUNCTION_NAME: `council-bedrock-agent-${stage}`,
      },
    });

    // ── Bedrock Agent ───────────────────────────────────────────────────
    this.bedrockFn = new lambda.Function(this, "BedrockFn", {
      ...commonProps,
      functionName: `council-bedrock-agent-${stage}`,
      handler: "handlers/bedrock.handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(120),
      code: localBundle("handlers/bedrock.ts", backendPath, true),
      environment: commonEnv,
    });

    // ── WebSocket Handler ───────────────────────────────────────────────
    this.wsHandlerFn = new lambda.Function(this, "WsHandlerFn", {
      ...commonProps,
      functionName: `council-ws-handler-${stage}`,
      handler: "handlers/websocket.wsConnect",
      code: localBundle("handlers/websocket.ts", backendPath),
      environment: commonEnv,
    });

    // ── IAM Grants ───────────────────────────────────────────────────────

    // DynamoDB
    props.table.grantReadWriteData(this.sessionFn);
    props.table.grantReadWriteData(this.orchestratorFn);
    props.table.grantReadWriteData(this.bedrockFn);
    props.table.grantReadWriteData(this.wsHandlerFn);

    // S3
    props.bucket.grantReadWrite(this.orchestratorFn);
    props.bucket.grantRead(this.sessionFn);

    // Bedrock — Converse / ConverseStream (Amazon Nova Pro, no Marketplace required)
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"],
      resources: [
        `arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0`,
        `arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-pro-v1:0`,
        `arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-pro-v1:0`,
        `arn:aws:bedrock:us-east-1:${cdk.Aws.ACCOUNT_ID}:inference-profile/us.amazon.nova-pro-v1:0`,
      ],
    });
    this.bedrockFn.addToRolePolicy(bedrockPolicy);
    this.orchestratorFn.addToRolePolicy(bedrockPolicy);

    // Lambda invocation (Orchestrator → BedrockFn)
    this.bedrockFn.grantInvoke(this.orchestratorFn);

    // execute-api:ManageConnections (wildcard — avoids cross-stack reference cycle)
    const wsConnectPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["execute-api:ManageConnections"],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:*`],
    });
    this.wsHandlerFn.addToRolePolicy(wsConnectPolicy);
    this.orchestratorFn.addToRolePolicy(wsConnectPolicy);
    this.bedrockFn.addToRolePolicy(wsConnectPolicy);

    // ── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "SessionFnArn", { value: this.sessionFn.functionArn });
    new cdk.CfnOutput(this, "OrchestratorFnArn", { value: this.orchestratorFn.functionArn });
    new cdk.CfnOutput(this, "BedrockFnArn", { value: this.bedrockFn.functionArn });
    new cdk.CfnOutput(this, "WsHandlerFnArn", { value: this.wsHandlerFn.functionArn });
  }
}
