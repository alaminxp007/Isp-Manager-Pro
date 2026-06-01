import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import rolesRouter from "./roles";
import permissionsRouter from "./permissions";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import zonesRouter from "./zones";
import paymentsRouter from "./payments";
import billsRouter from "./bills";
import employeesRouter from "./employees";
import mikrotiksRouter from "./mikrotiks";
import ticketsRouter from "./tickets";
import companyRouter from "./company";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(rolesRouter);
router.use(permissionsRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(zonesRouter);
router.use(paymentsRouter);
router.use(billsRouter);
router.use(employeesRouter);
router.use(mikrotiksRouter);
router.use(ticketsRouter);
router.use(companyRouter);

export default router;
