import request from "supertest";

import app from "../../src/app.js";

///////////////////////////////////////////////////////
// Verify API errors return JSON responses
///////////////////////////////////////////////////////
describe("API error handling", () => {
  it("returns JSON for an invalid JSON body", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set("Content-Type", "application/json")
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toContain("application/json");

    expect(response.body).toEqual({
      error: "Invalid JSON body",
    });
  });

  it("returns JSON for a route that does not exist", async () => {
    const response = await request(app).get("/api/route-that-does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");

    expect(response.body).toEqual({
      error: "Route not found",
    });
  });
});
