import serverless from "serverless-http";
import { app, ensureTables } from "../../server/app.js";

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await ensureTables();
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error("Database initialization error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Database initialization failed",
      }),
    };
  }
};