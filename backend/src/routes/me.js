import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getListings, getPurchases } from "../services/me.js";

const router = Router();

router.use(requireAuth);

// 마이 페이지 - 낙찰 내역
router.get("/purchases", async (req, res) => {
  res.json({ purchases: await getPurchases(req.user.id) });
});

// 마이 페이지 - 내가 등록한 물건
router.get("/listings", async (req, res) => {
  res.json({ listings: await getListings(req.user.id) });
});

export default router;
