const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs");

/*   GET /jobs (display all the job listings belonging to this user)
POST /jobs (Add a new job listing)
GET /jobs/new (Put up the form to create a new entry)
GET /jobs/edit/:id (Get a particular entry and show it in the edit box)
POST /jobs/update/:id (Update a particular entry)
POST /jobs/delete/:id (Delete an entry)   */

// GET all jobs
router.get("/", jobsController.getAllJobs);

// Show new job form
router.get("/new", jobsController.showNewForm);

// Create job
router.post("/", jobsController.createJob);

// Show edit form
router.get("/edit/:id", jobsController.showEditForm);

// Update job
router.post("/update/:id", jobsController.updateJob);

// Delete job
router.post("/delete/:id", jobsController.deleteJob);

module.exports = router;
