import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { LambdaStack } from "../lib/lambda-stack";
import { ApiStack } from "../lib/api-stack";
import { MonitoringStack } from "../lib/monitoring-stack";
import * as devConfig from "../config/dev.json";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "dev";
const config = devConfig; // extend for staging/prod as needed

const env: cdk.Environment = {
  account: config.account,
  region: config.region,
};

const tags = {
  project: "council",
  environment: stage as string,
  team: "aiforbharat",
  "managed-by": "cdk",
};

const storage = new StorageStack(app, `CouncilStorage-${stage}`, { env, tags });

const lambdas = new LambdaStack(app, `CouncilLambda-${stage}`, {
  env,
  tags,
  table: storage.table,
  bucket: storage.bucket,
});

const api = new ApiStack(app, `CouncilApi-${stage}`, {
  env,
  tags,
  sessionFn: lambdas.sessionFn,
  orchestratorFn: lambdas.orchestratorFn,
  bedrockFn: lambdas.bedrockFn,
  wsHandlerFn: lambdas.wsHandlerFn,
});

new MonitoringStack(app, `CouncilMonitoring-${stage}`, {
  env,
  tags,
  orchestratorFn: lambdas.orchestratorFn,
  sessionFn: lambdas.sessionFn,
  bedrockFn: lambdas.bedrockFn,
  wsHandlerFn: lambdas.wsHandlerFn,
  restApi: api.restApi,
});

app.synth();
