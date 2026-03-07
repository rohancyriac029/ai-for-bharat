import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";

interface StorageStackProps extends cdk.StackProps {
  tags?: Record<string, string>;
}

export class StorageStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps = {}) {
    super(scope, id, props);

    if (props.tags) {
      for (const [k, v] of Object.entries(props.tags)) {
        cdk.Tags.of(this).add(k, v);
      }
    }

    // ── DynamoDB: council_sessions ──────────────────────────────────────
    this.table = new dynamodb.Table(this, "SessionsTable", {
      tableName: "council_sessions",
      partitionKey: { name: "session_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // ── S3: council-debates ─────────────────────────────────────────────
    const stage = this.node.tryGetContext("stage") ?? "dev";
    this.bucket = new s3.Bucket(this, "DebatesBucket", {
      bucketName: `council-debates-${stage}-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy:
        stage === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== "prod",
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: "expire-old-transcripts",
          expiration: cdk.Duration.days(365),
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // ── Outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "SessionsTableName", {
      value: this.table.tableName,
      exportName: `council-sessions-table-name-${stage}`,
    });

    new cdk.CfnOutput(this, "DebatesBucketName", {
      value: this.bucket.bucketName,
      exportName: `council-debates-bucket-name-${stage}`,
    });
  }
}
