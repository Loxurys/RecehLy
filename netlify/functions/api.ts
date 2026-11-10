import serverless from "serverless-http";
import { app, ensureTables } from "../../server/app.js";

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await ensureTables();
  } catch (error) {
    console.error("ensureTables serverless error:", error);
  }
  return serverlessHandler(event, context);
};
