import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import statsRouter from "./stats.js";
import employeesRouter from "./employees.js";
import consultantsRouter from "./consultants.js";
import traineesRouter from "./trainees.js";
import companiesRouter from "./companies.js";
import nonprofitsRouter from "./nonprofits.js";
import nonprofitCompaniesRouter from "./nonprofit-companies.js";
import servicesRouter from "./services.js";
import projectsRouter from "./projects.js";
import usersRouter from "./users.js";
import importRouter from "./import.js";
import exportRouter from "./export.js";
import seedRouter from "./seed.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stats", statsRouter);
router.use("/employees", employeesRouter);
router.use("/consultants", consultantsRouter);
router.use("/trainees", traineesRouter);
router.use("/companies", companiesRouter);
router.use("/nonprofits", nonprofitsRouter);
router.use("/nonprofit-companies", nonprofitCompaniesRouter);
router.use("/services", servicesRouter);
router.use("/projects", projectsRouter);
router.use("/users", usersRouter);
router.use("/import", importRouter);
router.use("/export", exportRouter);
router.use("/seed", seedRouter);

export default router;