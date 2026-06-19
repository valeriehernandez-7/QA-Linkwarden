import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import verifyToken from "./verifyToken";
import verifySubscription from "./stripe/verifySubscription";
import verifyUser from "./verifyUser";

vi.mock("@linkwarden/prisma", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock("./verifyToken", () => ({
    default: vi.fn(),
}));
 
vi.mock("./stripe/verifySubscription", () => ({
    default: vi.fn(),
}));

const mockReq = {} as any;

const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
} as any;
 
const mockUser = {
    id: 1,
    username: "aaron",
    emailVerified: new Date(),
};

describe("VerifyUser tests", () => {
    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.NEXT_PUBLIC_EMAIL_PROVIDER;
    });

    it("Token is a string", async () => {
        vi.mocked(verifyToken).mockResolvedValue("Invalid token" as any);
 
        const res = await verifyUser({ req: mockReq, res: mockRes });
 
        expect(res).toBeNull();
        expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("User doesnt exist", async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 1 } as any);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
 
        const res = await verifyUser({ req: mockReq, res: mockRes });
 
        expect(res).toBeNull();
        expect(prisma.user.findUnique).toHaveBeenCalledOnce();
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it("User has no username", async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 1 } as any);
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, username: null } as any);
 
        const res = await verifyUser({ req: mockReq, res: mockRes });
 
        expect(res).toBeNull();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ response: "Username not found." });
    });

     it("Email not verified", async () => {
        process.env.NEXT_PUBLIC_EMAIL_PROVIDER = "true";
        vi.mocked(verifyToken).mockResolvedValue({ id: 1 } as any);
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, emailVerified: null } as any);
 
        const res = await verifyUser({ req: mockReq, res: mockRes });
 
        expect(res).toBeNull();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            response:
                "Email not verified, please verify your email to continue using Linkwarden.",
        });
    });
})