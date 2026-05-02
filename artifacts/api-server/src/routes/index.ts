import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import analyzeStreamRouter from "./analyze-stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeStreamRouter);
router.use(analyzeRouter);

export default router;
