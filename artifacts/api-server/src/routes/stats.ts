import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { Employee, Consultant, Trainee, Company, Nonprofit, Service, Project } from "../lib/mongo.js";

const router = Router();

router.get("/dashboard", authenticate, async (_req, res) => {
  try {
    const [
      employees, consultants, trainees, companies, nonprofits, services, projects,
      activeProjects, plannedProjects, completedProjects, suspendedProjects,
      activeEmployees, onLeaveEmployees, resignedEmployees, terminatedEmployees,
      availableConsultants, busyConsultants, inactiveConsultants, activeServices,
    ] = await Promise.all([
      Employee.countDocuments({ is_deleted: false }),
      Consultant.countDocuments({ is_deleted: false }),
      Trainee.countDocuments({ is_deleted: false }),
      Company.countDocuments({ is_deleted: false }),
      Nonprofit.countDocuments({ is_deleted: false }),
      Service.countDocuments({ is_deleted: false }),
      Project.countDocuments({ is_deleted: false }),
      Project.countDocuments({ is_deleted: false, status: "active" }),
      Project.countDocuments({ is_deleted: false, status: "planned" }),
      Project.countDocuments({ is_deleted: false, status: "completed" }),
      Project.countDocuments({ is_deleted: false, status: "suspended" }),
      Employee.countDocuments({ is_deleted: false, status: "active" }),
      Employee.countDocuments({ is_deleted: false, status: "on_leave" }),
      Employee.countDocuments({ is_deleted: false, status: "resigned" }),
      Employee.countDocuments({ is_deleted: false, status: "terminated" }),
      Consultant.countDocuments({ is_deleted: false, availability: "available" }),
      Consultant.countDocuments({ is_deleted: false, availability: "busy" }),
      Consultant.countDocuments({ is_deleted: false, availability: "inactive" }),
      Service.countDocuments({ is_deleted: false, is_active: true }),
    ]);

    const recentEmployeeDocs = await Employee.find({ is_deleted: false })
      .sort({ _id: -1 }).limit(6)
      .select("full_name position department status").lean();
    const recentEmployees = recentEmployeeDocs.map(e => ({
      fullName: e.full_name, position: e.position,
      department: e.department, status: e.status,
    }));

    const recentProjectDocs = await Project.find({ is_deleted: false })
      .sort({ _id: -1 }).limit(6).lean();
    const recentProjects = await Promise.all(recentProjectDocs.map(async p => {
      const company = p.company_id ? await Company.findOne({ _id: p.company_id }).select("company_name").lean() : null;
      const service = p.service_id ? await Service.findOne({ _id: p.service_id }).select("service_name").lean() : null;
      return {
        projectName: p.project_name,
        companyName: company?.company_name || null,
        serviceName: service?.service_name || null,
        status: p.status,
        startDate: p.start_date,
      };
    }));

    const recentConsultantDocs = await Consultant.find({ is_deleted: false })
      .sort({ _id: -1 }).limit(6)
      .select("full_name specialty academic_rank availability").lean();
    const recentConsultants = recentConsultantDocs.map(c => ({
      fullName: c.full_name, specialty: c.specialty,
      academicRank: c.academic_rank, availability: c.availability,
    }));

    const trainingTypesAgg = await Trainee.aggregate([
      { $match: { is_deleted: false, training_type: { $ne: null } } },
      { $group: { _id: "$training_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, type: "$_id", count: 1 } },
    ]);

    res.json({
      employees, consultants, trainees, companies, nonprofits, services, projects,
      activeProjects, plannedProjects, completedProjects, suspendedProjects,
      activeEmployees, onLeaveEmployees, resignedEmployees, terminatedEmployees,
      availableConsultants, busyConsultants, inactiveConsultants, activeServices,
      recentEmployees, recentProjects, recentConsultants,
      trainingTypes: trainingTypesAgg,
    });
  } catch (err: any) {
    res.status(500).json({ message: "خطأ في الخادم", detail: err.message });
  }
});

export default router;
