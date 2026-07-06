import client from "../client";

export const dashboardService = {
  get: () => client.get("/dashboard").then(r => r.data),
};
