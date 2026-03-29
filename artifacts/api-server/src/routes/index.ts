import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dealsRouter from "./deals";
import subscribersRouter from "./subscribers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dealsRouter);
router.use(subscribersRouter);

export default router;
