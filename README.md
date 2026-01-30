## PROJECT TECHNICAL SPECIFICATION

### CORE STACK (Specs)

- Framework: **NestJS v11.x**
- ORM: **Prisma v7.x**
- Database: **PostgreSQL**
- API Documentation: **Swagger**
- Code Formatting: **Prettier**

### Environment Variables

```
DATABASE_URL=
JWT_SECRET=
ORIGIN_URL=
# file upload
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
# mails
MAIL_HOST=
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=
```

To run the project, create a **.env** file and define these required keys:

### MODULE FEATURES

- **auth**: ID/Password-based Login & Register, Google/Apple social Login & Register.
- **file**: Aws S3 file upload.
- **user**: User table CRUD.
- **health**: Application status check endpoint.
- **mail**: Email sending functionality.
- **prisma**: Prisma Client connection and DB adapter management(Postgre).

### METHOD NAMING CONVENTION

Method names use **lowerCamelCase** and follow the **Verb (Action) + Object** structure, ensuring clarity and consistency across layers.

| Function             | Service/Repository (Data Access) | Controller (API Endpoint) | Rationale                                                                    |
| :------------------- | :------------------------------- | :------------------------ | :--------------------------------------------------------------------------- |
| **Single Retrieval** | `find...` (e.g., `findOneById`)  | `findOne`                 | Aligns with ORM standards (Prisma/TypeORM) for data access.                  |
| **List Retrieval**   | `find...` (e.g., `findAllUsers`) | `findAll`                 | Aligns with RESTful standards and NestJS/Express conventions.                |
| **Deletion**         | `delete...` (e.g., `deleteUser`) | `remove`                  | Separates DB standard (`delete`) from NestJS Controller standard (`remove`). |
| **Compound Action**  | `get...` (e.g., `getTokens`)     | `login` / `refresh`       | `get` is reserved for high-level functions involving business logic.         |
