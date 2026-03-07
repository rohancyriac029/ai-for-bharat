import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";


interface ApiStackProps extends cdk.StackProps {
  sessionFn: lambda.Function;
  orchestratorFn: lambda.Function;
  bedrockFn: lambda.Function;
  wsHandlerFn: lambda.Function;
  tags?: Record<string, string>;
}

export class ApiStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi;
  public readonly wsApi: apigatewayv2.WebSocketApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    if (props.tags) {
      for (const [k, v] of Object.entries(props.tags)) {
        cdk.Tags.of(this).add(k, v);
      }
    }

    const stage = this.node.tryGetContext("stage") ?? "dev";

    // ── REST API ─────────────────────────────────────────────────────────
    this.restApi = new apigateway.RestApi(this, "CouncilRestApi", {
      restApiName: `council-api-${stage}`,
      description: "COUNCIL editorial boardroom REST API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization", "x-session-id"],
      },
      deployOptions: {
        stageName: stage as string,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false, // avoid logging PII
        tracingEnabled: true,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      },
    });

    const api = this.restApi.root.addResource("api");
    const sessions = api.addResource("sessions");

    // POST /api/sessions/start
    const start = sessions.addResource("start");
    start.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.sessionFn)
    );

    // GET  /api/sessions/{id}
    // POST /api/sessions/{id}/debate
    // POST /api/sessions/{id}/select-path
    // GET  /api/sessions/{id}/draft
    const sessionById = sessions.addResource("{id}");
    sessionById.addMethod(
      "GET",
      new apigateway.LambdaIntegration(props.sessionFn)
    );

    const debate = sessionById.addResource("debate");
    debate.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.orchestratorFn)
    );

    const selectPath = sessionById.addResource("select-path");
    selectPath.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.sessionFn)
    );

    const draft = sessionById.addResource("draft");
    draft.addMethod(
      "GET",
      new apigateway.LambdaIntegration(props.sessionFn)
    );

    // ── WebSocket API ────────────────────────────────────────────────────
    const wsConnectIntegration = new WebSocketLambdaIntegration(
      "ConnectIntegration",
      props.wsHandlerFn
    );
    const wsDisconnectIntegration = new WebSocketLambdaIntegration(
      "DisconnectIntegration",
      props.wsHandlerFn
    );
    const wsDefaultIntegration = new WebSocketLambdaIntegration(
      "DefaultIntegration",
      props.wsHandlerFn
    );

    this.wsApi = new apigatewayv2.WebSocketApi(this, "CouncilWsApi", {
      apiName: `council-ws-${stage}`,
      connectRouteOptions: { integration: wsConnectIntegration },
      disconnectRouteOptions: { integration: wsDisconnectIntegration },
      defaultRouteOptions: { integration: wsDefaultIntegration },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, "CouncilWsStage", {
      webSocketApi: this.wsApi,
      stageName: stage as string,
      autoDeploy: true,
    });

    // Grant WS manage-connections to wsHandlerFn and orchestratorFn.
    // NOTE: IAM policy for execute-api:ManageConnections is set in LambdaStack
    // with a wildcard resource to avoid a cross-stack cyclic reference.

    // NOTE: WS_ENDPOINT env var is set on Lambda functions via a post-deploy
    // script or by re-running: cdk deploy --context stage=dev after first deploy.
    // The callbackUrl is exported below so it can be copied into .env or SSM.
    new cdk.CfnOutput(this, "WsCallbackUrlNote", {
      value: wsStage.callbackUrl,
      description: "Set this as WS_ENDPOINT env var on bedrock/orchestrator/ws-handler Lambdas",
    });

    // ── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "RestApiEndpoint", {
      value: this.restApi.url,
      exportName: `council-rest-api-url-${stage}`,
    });
    new cdk.CfnOutput(this, "WsApiEndpoint", {
      value: wsStage.url,
      exportName: `council-ws-api-url-${stage}`,
    });
  }
}
