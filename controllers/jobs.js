const Job = require("../models/Job");
const parseVErr = require("../utils/parseValidationErrs");

exports.getAllJobs = async (req, res) => {
  const jobs = await Job.find({ createdBy: req.user._id });
  res.render("jobs", { jobs });
};

exports.showNewForm = (req, res) => {
  res.render("job", { job: null });
};

exports.createJob = async (req, res) => {
  try {
    await Job.create({
      ...req.body,
      createdBy: req.user._id,
    });

    req.flash("info", "Job created successfully.");
    res.redirect("/jobs");
  } catch (e) {
    parseVErr(e, req);
    res.redirect("/jobs/new");
  }
};

exports.showEditForm = async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!job) {
    req.flash("error", "Job not found.");
    return res.redirect("/jobs");
  }

  res.render("job", { job });
};

exports.updateJob = async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!job) {
    req.flash("error", "Job not found.");
  } else {
    req.flash("info", "Job updated.");
  }

  res.redirect("/jobs");
};

exports.deleteJob = async (req, res) => {
  await Job.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  req.flash("info", "Job deleted.");
  res.redirect("/jobs");
};
