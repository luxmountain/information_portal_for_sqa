require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');
const authGuard = require('./middleware/auth');
const buildCrudRouter = require('./utils/crudFactory');

const authRoutes = require('./routes/auth');
const majorsRoutes = require('./routes/majors');
const homeRoutes = require('./routes/home');
const dashboardRoutes = require('./routes/dashboard');
const uploadRoutes = require('./routes/upload');
const studentsRoutes = require('./routes/students');
const departmentsRoutes = require('./routes/departments');
const internshipPeriodsRoutes = require('./routes/internship-periods');
const internshipEnterprisesRoutes = require('./routes/internship-enterprises');
const periodEnterprisesRoutes = require('./routes/period-enterprises');
const internshipLecturersRoutes = require('./routes/internship-lecturers');
const internshipRegistrationsRoutes = require('./routes/internship-registrations');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// File tĩnh
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/home', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/majors', majorsRoutes);
app.use('/api/internship-periods', internshipPeriodsRoutes);
app.use('/api/internship-enterprises', internshipEnterprisesRoutes);
app.use('/api/period-enterprises', periodEnterprisesRoutes);
app.use('/api/internship-lecturers', internshipLecturersRoutes);
app.use('/api/internship-registrations', internshipRegistrationsRoutes);
// Routes dashboard: track-visit là public, stats cần xác thực
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);

const resources = [
  { path: '/api/banners', tableName: 'banners', searchableFields: ['title'], authGuard },
  { path: '/api/news', tableName: 'news', searchableFields: ['title', 'summary', 'content'], authGuard, nullableFields: ['published_at', 'summary', 'image_url'], dateFields: ['published_at'] },
  { path: '/api/events', tableName: 'events', searchableFields: ['title', 'location', 'description'], authGuard, nullableFields: ['event_time', 'location', 'description', 'cover_image'], dateFields: ['event_date'] },
  {
    path: '/api/recruitment',
    tableName: 'recruitment_posts',
    searchableFields: ['title', 'company_name', 'position', 'job_description'],
    authGuard,
  },
  {
    path: '/api/enterprises',
    tableName: 'enterprises',
    searchableFields: ['name', 'industry', 'description'],
    authGuard,
  },
  {
    path: '/api/lecturers',
    tableName: 'lecturers',
    searchableFields: ['name', 'email', 'phone', 'specialization'],
    authGuard,
    nullableFields: ['academic_rank'],
    uniqueFields: ['phone'],
  },
  {
    path: '/api/research',
    tableName: 'research_projects',
    searchableFields: ['title', 'lead_lecturer', 'co_authors'],
    authGuard,
  },
  {
    path: '/api/student-documents',
    tableName: 'student_documents',
    searchableFields: ['title', 'category'],
    authGuard,
  },
  {
    path: '/api/admissions',
    tableName: 'admissions',
    searchableFields: ['admission_year', 'description'],
    authGuard,
  },
  {
    path: '/api/faculty-info',
    tableName: 'faculty_information',
    searchableFields: ['name', 'phone', 'email', 'address'],
    authGuard,
  },
];

resources.forEach(({ path, ...options }) => {
  app.use(path, buildCrudRouter(options));
});

app.use(errorHandler);

module.exports = app;