import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

interface MonitoringStackProps extends cdk.StackProps {
  orchestratorFn: lambda.Function;
  sessionFn: lambda.Function;
  bedrockFn: lambda.Function;
  wsHandlerFn: lambda.Function;
  restApi: apigateway.RestApi;
  tags?: Record<string, string>;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    if (props.tags) {
      for (const [k, v] of Object.entries(props.tags)) {
        cdk.Tags.of(this).add(k, v);
      }
    }

    const stage = this.node.tryGetContext("stage") ?? "dev";

    // ── CloudWatch Dashboard ─────────────────────────────────────────────
    const dashboard = new cloudwatch.Dashboard(this, "CouncilDashboard", {
      dashboardName: `council-${stage}`,
    });

    const fns = [
      { name: "Orchestrator", fn: props.orchestratorFn },
      { name: "Session", fn: props.sessionFn },
      { name: "Bedrock", fn: props.bedrockFn },
      { name: "WsHandler", fn: props.wsHandlerFn },
    ];

    // Invocations + Errors widget per function
    const invWidgets = fns.map(
      ({ name, fn }) =>
        new cloudwatch.GraphWidget({
          title: `${name} — Invocations & Errors`,
          left: [fn.metricInvocations({ period: cdk.Duration.minutes(5) })],
          right: [fn.metricErrors({ period: cdk.Duration.minutes(5) })],
          width: 6,
        })
    );

    // Duration P95 widget
    const durWidgets = fns.map(
      ({ name, fn }) =>
        new cloudwatch.GraphWidget({
          title: `${name} — Duration P95`,
          left: [
            fn.metric("Duration", {
              statistic: "p95",
              period: cdk.Duration.minutes(10),
            }),
          ],
          width: 6,
        })
    );

    dashboard.addWidgets(...invWidgets);
    dashboard.addWidgets(...durWidgets);

    // ── Alarms ───────────────────────────────────────────────────────────

    // Orchestrator Error Rate > 5%
    new cloudwatch.Alarm(this, "OrchestratorErrorRate", {
      alarmName: `council-orchestrator-error-rate-${stage}`,
      metric: props.orchestratorFn.metricErrors({
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Orchestrator P95 Duration > 150s
    new cloudwatch.Alarm(this, "OrchestratorDurationP95", {
      alarmName: `council-orchestrator-duration-p95-${stage}`,
      metric: props.orchestratorFn.metric("Duration", {
        statistic: "p95",
        period: cdk.Duration.minutes(10),
      }),
      threshold: 150000, // ms
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // API Gateway 5xx > 10
    new cloudwatch.Alarm(this, "RestApi5xx", {
      alarmName: `council-rest-api-5xx-${stage}`,
      metric: props.restApi.metricServerError({
        period: cdk.Duration.minutes(1),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Berock Fn Error Rate
    new cloudwatch.Alarm(this, "BedrockFnErrors", {
      alarmName: `council-bedrock-fn-errors-${stage}`,
      metric: props.bedrockFn.metricErrors({
        period: cdk.Duration.minutes(5),
      }),
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=council-${stage}`,
    });
  }
}
