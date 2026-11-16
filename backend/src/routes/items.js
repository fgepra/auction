import { Router } from "express";
import { notFound } from "../errors.js";
import { itemDetailDto, itemSummaryDto } from "../lib/serialize.js";
import { parseBid, parseNewItem } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { placeBid } from "../services/bids.js";
import { SORTS, createItem, getItemDetail, listActiveItems } from "../services/items.js";

const router = Router();

function parseId(raw) {
  if (!/^\d{1,18}$/.test(raw)) throw notFound("없는 물건이에요.");
  return Number(raw);
}

function intParam(raw, fallback, min, max) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// 홈: 경매 중인 물건 목록   GET /api/items?sort=all|urgent|popular|new&limit=50&offset=0
router.get("/", async (req, res) => {
  const sort = SORTS.includes(req.query.sort) ? req.query.sort : "all";
  const rows = await listActiveItems({
    sort,
    limit: intParam(req.query.limit, 50, 1, 100),
    offset: intParam(req.query.offset, 0, 0, 100000),
  });
  res.json({ items: rows.map(itemSummaryDto) });
});

// 물건 등록 (로그인 필요)
router.post("/", requireAuth, async (req, res) => {
  const input = parseNewItem(req.body);
  const { id } = await createItem(req.user, input);
  res.status(201).json({ id: String(id) });
});

// 상세: 기능, 이야기, 입찰 기록 포함
router.get("/:id", async (req, res) => {
  const found = await getItemDetail(parseId(req.params.id));
  if (!found) throw notFound("없는 물건이에요.");
  res.json({ item: itemDetailDto(found.item, found.bids) });
});

// 입찰 (로그인 필요)
router.post("/:id/bids", requireAuth, async (req, res) => {
  const itemId = parseId(req.params.id);
  const { amount } = parseBid(req.body);
  const result = await placeBid(req.user.id, itemId, amount);
  res.status(201).json(result);
});

export default router;
