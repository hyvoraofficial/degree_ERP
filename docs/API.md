# HYVORA EduERP REST API Specification

This document details the REST API specifications for **HYVORA EduERP**. All endpoints are versioned under `/api/v1` and utilize a standardized multi-tenant JSON envelope.

---

## 1. Global Specifications

### Tenant Isolation
Every request must specify the active tenant. The system detects the tenant via:
1. Custom header: `X-Academy-Subdomain: demo`
2. Subdomain mapping (automatically resolved in edge middleware).

### Global Envelope Format

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": {},
  "message": "Descriptive message"
}
```

#### Error Envelope (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Server Error`)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error details",
    "details": {}
  }
}
```

---

## 2. Authentication & RBAC Module

### Login Authentication
* **Endpoint**: `/api/v1/auth/login`
* **Method**: `POST`
* **Auth Required**: No
* **Permissions**: None
* **Request Body**:
  ```json
  {
    "email": "admin@academy.edu",
    "password": "securepassword",
    "role": "ACADEMY_ADMIN"
  }
  ```
* **Validation Rules**:
  * `email`: Required, valid email string format.
  * `password`: Required, minimum 8 characters.
  * `role`: Required, enum: `SUPER_ADMIN`, `ACADEMY_ADMIN`, `TEACHER`, `STUDENT`.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "u1111111-1111-1111-1111-111111111111",
        "email": "admin@academy.edu",
        "firstName": "Hemanth",
        "lastName": "Admin",
        "role": "ACADEMY_ADMIN"
      }
    },
    "message": "Login successful"
  }
  ```

---

## 3. Academies & Settings Module

### Get Academy Settings
* **Endpoint**: `/api/v1/academy/settings`
* **Method**: `GET`
* **Auth Required**: Yes
* **Permissions**: `settings:read` (Academy Admin, Super Admin)
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "a2222222-2222-2222-2222-222222222222",
      "academyId": "a1111111-1111-1111-1111-111111111111",
      "primaryColor": "#4F46E5",
      "secondaryColor": "#06B6D4",
      "address": "123 Science Park Drive",
      "phone": "+91-9876543210",
      "email": "info@academy.edu",
      "timezone": "Asia/Kolkata",
      "currency": "INR",
      "logo": {
        "id": "f1111111-1111-1111-1111-111111111111",
        "storagePath": "demo/syllabus/demo_syllabus_math.pdf"
      }
    }
  }
  ```

### Update Academy Settings
* **Endpoint**: `/api/v1/academy/settings`
* **Method**: `PATCH`
* **Auth Required**: Yes
* **Permissions**: `settings:update` (Academy Admin)
* **Request Body**:
  ```json
  {
    "primaryColor": "#4F46E5",
    "secondaryColor": "#06B6D4",
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "address": "Updated Address string"
  }
  ```
* **Validation Rules**:
  * `primaryColor` & `secondaryColor`: HEX format validation pattern.

---

## 4. Student Management Module

### List Students
* **Endpoint**: `/api/v1/students`
* **Method**: `GET`
* **Auth Required**: Yes
* **Permissions**: `students:read` (Teacher, Academy Admin, Super Admin)
* **Query Parameters**:
  * `search` (optional): Filter by student name or admission number.
  * `batchId` (optional): Filter by batch UUID.
  * `page` (optional, default: `1`): Pagination page index.
  * `limit` (optional, default: `10`): Page size limit.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "students": [
        {
          "id": "s1111111-1111-1111-1111-111111111111",
          "admissionNumber": "ADM-2026-0001",
          "firstName": "Arjun",
          "lastName": "Mehta",
          "email": "arjun@academy.edu",
          "status": "active"
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10
      }
    }
  }
  ```

### Create Student Profile
* **Endpoint**: `/api/v1/students`
* **Method**: `POST`
* **Auth Required**: Yes
* **Permissions**: `students:create` (Academy Admin)
* **Request Body**:
  ```json
  {
    "email": "newstudent@academy.edu",
    "firstName": "Rohan",
    "lastName": "Gupta",
    "admissionNumber": "ADM-2026-0003",
    "dateOfBirth": "2010-12-04",
    "gender": "male",
    "parentName": "Devendra Gupta",
    "parentPhone": "+91-7777777701"
  }
  ```
* **Validation Rules**:
  * `email`: Unique email string.
  * `admissionNumber`: Unique alphanumeric string.
  * `parentPhone`: Valid international format phone string.

---

## 5. Attendance Module

### Submit Daily Attendance
* **Endpoint**: `/api/v1/attendance`
* **Method**: `POST`
* **Auth Required**: Yes
* **Permissions**: `attendance:create` (Academy Admin, Teacher)
* **Request Body**:
  ```json
  {
    "batchId": "b1111111-1111-1111-1111-111111111111",
    "date": "2026-07-29",
    "records": [
      {
        "studentId": "s1111111-1111-1111-1111-111111111111",
        "status": "present"
      },
      {
        "studentId": "s2222222-2222-2222-2222-222222222222",
        "status": "absent",
        "remarks": "Sick leave"
      }
    ]
  }
  ```
* **Validation Rules**:
  * `date`: ISO date format (YYYY-MM-DD). Cannot be in the future.
  * `records`: Required array. Each record requires a valid student UUID.
  * `status`: Enum: `present`, `absent`, `late`, `excused`.

---

## 6. Financial (Fees & Payments) Module

### Create Fee Allocation
* **Endpoint**: `/api/v1/fees/allocations`
* **Method**: `POST`
* **Auth Required**: Yes
* **Permissions**: `fees:manage` (Academy Admin)
* **Request Body**:
  ```json
  {
    "feeStructureId": "fee11111-1111-1111-1111-111111111111",
    "batchId": "b1111111-1111-1111-1111-111111111111",
    "dueDate": "2026-08-30"
  }
  ```
* **Validation Rules**:
  * `feeStructureId`: Valid structure UUID.
  * `batchId`: Valid batch UUID.
  * `dueDate`: Future date validation.

### Initialize Payment Transaction
* **Endpoint**: `/api/v1/payments/initialize`
* **Method**: `POST`
* **Auth Required**: Yes
* **Permissions**: `payments:create` (Student, Academy Admin)
* **Request Body**:
  ```json
  {
    "feeAllocationId": "fa111111-1111-1111-1111-111111111111",
    "amount": 60000.00,
    "paymentMethod": "gateway",
    "gatewayProvider": "razorpay"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "transactionId": "pt333333-3333-3333-3333-333333333333",
      "gatewayOrderId": "order_rp_arjun456",
      "amount": 60000.00,
      "currency": "INR"
    }
  }
  ```

---

## 7. Learning Management & Assignments Module

### Submit Homework Assignment
* **Endpoint**: `/api/v1/assignments/submissions`
* **Method**: `POST`
* **Auth Required**: Yes
* **Permissions**: `submissions:submit` (Student)
* **Request Body**:
  ```json
  {
    "assignmentId": "as111111-1111-1111-1111-111111111111",
    "mediaFileId": "f3333333-3333-3333-3333-333333333333",
    "studentRemarks": "Solved all calculus integrations."
  }
  ```
* **Validation Rules**:
  * `assignmentId`: Valid assignment UUID.
  * `mediaFileId`: Valid media file UUID from storage catalog.

### Grade Submission
* **Endpoint**: `/api/v1/assignments/submissions/:id/grade`
* **Method**: `PATCH`
* **Auth Required**: Yes
* **Permissions**: `submissions:grade` (Teacher, Academy Admin)
* **Request Body**:
  ```json
  {
    "marksObtained": 45.50,
    "teacherRemarks": "Excellent steps. Minor arithmetic check."
  }
  ```
* **Validation Rules**:
  * `marksObtained`: Positive number, cannot exceed assignment's max marks.

---

## 8. Telemetry & Analytics Module

### Get Cached Dashboard Statistics
* **Endpoint**: `/api/v1/telemetry/dashboard`
* **Method**: `GET`
* **Auth Required**: Yes
* **Permissions**: None (Available to logged-in users, filters dashboard cache based on active role session)
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "totalStudents": 154,
        "totalTeachers": 12,
        "revenueMonthly": 345000
      }
    }
  }
  ```
