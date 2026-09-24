const { app, request, setup, teardown, cleanup, registerUser, authHeader, User, Seller } = require("./helpers");

beforeAll(async () => {
  await setup();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await teardown();
});

const validPayload = (overrides = {}) => ({
  storeName: "Status Store",
  storeDescription: "A legitimate store that passes full seller verification checks.",
  phone: "9888777666",
  address: "42 Test Avenue, Bengaluru 560001",
  kycDocuments: [{ documentType: "PAN", documentNumber: "ABCDE1234F", documentUrl: "https://example.com/pan.pdf" }],
  ...overrides,
});

const makeAdminToken = async () => {
  const creds = await registerUser();
  await User.findByIdAndUpdate(creds.user._id, { role: "ADMIN" });
  return creds.token;
};

describe("SELLER STATUS ENDPOINT", () => {
  test("requires authentication -> 401", async () => {
    const res = await request(app).get("/api/sellers/status");
    expect(res.status).toBe(401);
  });

  test("user with no seller application gets a clean 200 + null (no 404)", async () => {
    const creds = await registerUser();
    const res = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(res.status).toBe(200);
    expect(res.body.data.seller).toBeNull();
  });

  test("non USER/SELLER roles cannot read seller status -> 403", async () => {
    const adminToken = await makeAdminToken();
    const res = await request(app).get("/api/sellers/status").set(authHeader(adminToken));
    expect(res.status).toBe(403);
  });

  test("returns the authenticated user's own current status (PENDING after applying)", async () => {
    const creds = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    const res = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe("PENDING");
    expect(res.body.data.seller.storeName).toBe("Status Store");
  });

  test("status reflects APPROVED after admin approval", async () => {
    const adminToken = await makeAdminToken();
    const creds = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    const seller = await Seller.findOne({ user: creds.user._id });
    await request(app).patch(`/api/admin/sellers/${seller._id}/approve`).set(authHeader(adminToken));

    const res = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe("APPROVED");
    expect(res.body.data.seller.approvedAt).toBeTruthy();
  });

  test("one user can never see another seller's status", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(b.token)).send(validPayload({ storeName: "Secret Store B" }));

    const statusA = await request(app).get("/api/sellers/status").set(authHeader(a.token));
    expect(statusA.status).toBe(200);
    expect(statusA.body.data.seller).toBeNull();
    expect(JSON.stringify(statusA.body)).not.toContain("Secret Store B");
  });

  test("pending/approved/rejected/suspended lifecycle statuses flow through the endpoint", async () => {
    const adminToken = await makeAdminToken();
    const creds = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    const seller = await Seller.findOne({ user: creds.user._id });

    const pending = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(pending.body.data.seller.status).toBe("PENDING");

    await request(app).patch(`/api/admin/sellers/${seller._id}/reject`).set(authHeader(adminToken)).send({ reason: "Docs unclear" });
    const rejected = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(rejected.body.data.seller.status).toBe("REJECTED");
    expect(rejected.body.data.seller.rejectedReason).toBe("Docs unclear");

    await request(app).patch(`/api/admin/sellers/${seller._id}/approve`).set(authHeader(adminToken));
    const approved = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(approved.body.data.seller.status).toBe("APPROVED");

    await request(app).patch(`/api/admin/sellers/${seller._id}/suspend`).set(authHeader(adminToken)).send({ reason: "From test" });
    const suspended = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(suspended.body.data.seller.status).toBe("SUSPENDED");
    expect(suspended.body.data.seller.suspendedReason).toBe("From test");
  });
});

describe("SELLER REGISTRATION", () => {
  test("valid registration succeeds -> 201 PENDING (role stays USER)", async () => {
    const creds = await registerUser();
    const res = await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.data.seller.status).toBe("PENDING");
    const user = await User.findById(creds.user._id);
    expect(user.role).toBe("USER");
  });

  describe("KYC DOCUMENT TYPES (display labels vs backend enum)", () => {
    const cases = [
      ["PAN", "ABCDE1234F"],
      ["AADHAAR", "123456789012"],
      ["PASSPORT", "A1234567"],
      ["DRIVING_LICENSE", "MH0120171234"],
      ["OTHER", "doc-abc"],
    ];
    for (const [documentType, documentNumber] of cases) {
      test(`accepts supported ${documentType} -> 201 PENDING`, async () => {
        const creds = await registerUser();
        const res = await request(app)
          .post("/api/sellers/register")
          .set(authHeader(creds.token))
          .send(validPayload({ kycDocuments: [{ documentType, documentNumber, documentUrl: "https://example.com/doc.pdf" }] }));
        expect(res.status).toBe(201);
        expect(res.body.data.seller.status).toBe("PENDING");
        expect(res.body.data.seller.kycDocuments[0].documentType).toBe(documentType);
      });
    }

    test("rejects unsupported document type -> 422 with exact enum", async () => {
      const creds = await registerUser();
      const res = await request(app)
        .post("/api/sellers/register")
        .set(authHeader(creds.token))
        .send(validPayload({ kycDocuments: [{ documentType: "VOTER_CARD", documentNumber: "ABC123", documentUrl: "https://x" }] }));
      expect(res.status).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "kycDocuments[0].documentType", message: expect.stringContaining("invalid documentType") }),
        ])
      );
    });

    test("rejects lowercase/padded display-style documentType -> 422 (backend enum is exact)", async () => {
      const creds = await registerUser();
      for (const documentType of ["Passport", "passport", "PASSPORT ", "Driving Licence"]) {
        const res = await request(app)
          .post("/api/sellers/register")
          .set(authHeader(creds.token))
          .send(validPayload({ kycDocuments: [{ documentType, documentNumber: "A1234567", documentUrl: "https://x" }] }));
        expect(res.status).toBe(422);
      }
    });
  });

  test("requires authentication -> 401", async () => {
    const res = await request(app).post("/api/sellers/register").send(validPayload());
    expect(res.status).toBe(401);
  });

  test("invalid registration -> 422 and errors identify the field", async () => {
    const badPhone = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(validPayload({ phone: "abc" }));
    expect(badPhone.status).toBe(422);
    expect(badPhone.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "phone", message: expect.stringContaining("phone") })])
    );

    const badPan = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(validPayload({ kycDocuments: [{ documentType: "PAN", documentNumber: "123", documentUrl: "x" }] }));
    expect(badPan.status).toBe(422);
    expect(badPan.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "kycDocuments[0].documentNumber",
          message: expect.stringContaining("PAN"),
        }),
      ])
    );

    const badType = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(validPayload({ kycDocuments: [{ documentType: "VOTER_CARD", documentNumber: "ABC123", documentUrl: "https://x" }] }));
    expect(badType.status).toBe(422);
    expect(badType.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "kycDocuments[0].documentType", message: expect.stringContaining("documentType") }),
      ])
    );

    const shortName = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(validPayload({ storeName: "S" }));
    expect(shortName.status).toBe(422);
    expect(shortName.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "storeName" })])
    );
  });

  test("registration without KYC -> 422 with field kycDocuments", async () => {
    const { kycDocuments, ...withoutKyc } = validPayload();
    const res = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(withoutKyc);
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "kycDocuments" })])
    );
  });

  test("KYC rules stay enforced (5 max, documentUrl required)", async () => {
    const tooMany = validPayload({
      kycDocuments: Array.from({ length: 6 }, () => ({
        documentType: "PAN",
        documentNumber: "ABCDE1234F",
        documentUrl: "https://example.com/d.pdf",
      })),
    });
    const res1 = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(tooMany);
    expect(res1.status).toBe(422);
    expect(res1.body.errors[0].message).toContain("Maximum 5");

    const noUrl = validPayload({ kycDocuments: [{ documentType: "PAN", documentNumber: "ABCDE1234F", documentUrl: "" }] });
    const res2 = await request(app)
      .post("/api/sellers/register")
      .set(authHeader((await registerUser()).token))
      .send(noUrl);
    expect(res2.status).toBe(422);
    expect(res2.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "kycDocuments[0].documentUrl" })])
    );
  });

  test("duplicate (PENDING) registration rejected -> 409 with no duplicate record", async () => {
    const creds = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    const dup = await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    expect(dup.status).toBe(409);
    expect(await Seller.countDocuments({ user: creds.user._id })).toBe(1);
  });

  test("rejected applicant can reapply -> 201 resubmitted as PENDING", async () => {
    const adminToken = await makeAdminToken();
    const creds = await registerUser();
    await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(validPayload());
    const seller = await Seller.findOne({ user: creds.user._id });
    await request(app).patch(`/api/admin/sellers/${seller._id}/reject`).set(authHeader(adminToken)).send({ reason: "Resubmit" });

    const reapply = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send(validPayload({ storeName: "Improved Store" }));
    expect(reapply.status).toBe(201);
    expect(reapply.body.data.seller.status).toBe("PENDING");
    expect(reapply.body.data.seller.storeName).toBe("Improved Store");
    expect(await Seller.countDocuments({ user: creds.user._id })).toBe(1);
  });
});