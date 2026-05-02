import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import workspacesRouter from "./workspaces";
import membersRouter from "./members";
import filesRouter from "./files";
import messagesRouter from "./messages";
import invitesRouter from "./invites";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(workspacesRouter);
router.use(membersRouter);
router.use(filesRouter);
router.use(messagesRouter);
router.use(invitesRouter);
router.use(notificationsRouter);

export default router;
