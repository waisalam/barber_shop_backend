# BarbersCloud API Documentation

Backend API for the BarbersCloud barber shop booking app.

**Base URL:** `http://localhost:3000`  
**All requests must include header:** `Content-Type: application/json`

---

## Table of Contents

- [How IDs Work](#how-ids-work)
- [Auth Routes](#auth-routes)
- [Shop Routes](#shop-routes)
- [Appointment Routes](#appointment-routes)
- [Review Routes](#review-routes)
- [User Profile Routes](#user-profile-routes)
- [Full Booking Flow](#full-booking-flow)

---

## How IDs Work

This is the most important thing to understand before calling any API.

There are two types of IDs for users:

| ID Type | What it is | Where you get it |
|---|---|---|
| `userId` | The main user ID | Returned on login/signup |
| `customerProfileId` | Internal profile ID | You never need to send this |
| `barberProfileId` | Barber's profile ID | Returned in nearby shops response |

**Rule: Always send `userId` (from login response). The backend handles everything else.**

```
Login response gives you:
{
  "user": {
    "id": "this-is-your-userId"  ← save this, use it everywhere
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## Auth Routes

### 1. Signup
**POST** `/api/auth/signup`

Creates a new user account and sends OTP to email.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@gmail.com",
  "phoneNum": "9876543210",
  "password": "Test@1234",
  "role": "CUSTOMER",
  "gender": "Male",
  "dateOfBirth": "1995-06-15",
  "address": "123 Main Street",
  "pincode": "800001"
}
```

**Role options:** `CUSTOMER` or `BARBER` (never `ADMIN`)

**Success Response (201):**
```json
{
  "message": "Signup successful. Please verify your email.",
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "email": "john@gmail.com",
    "role": "CUSTOMER"
  }
}
```

**What to do after:** Save the `user.id` and navigate to OTP verification screen.

---

### 2. Verify OTP
**POST** `/api/auth/verify`

Verifies the OTP sent to the user's email.

**Request Body:**
```json
{
  "id": "user-uuid-from-signup-response",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

**What to do after:** Navigate to login screen.

---

### 3. Login
**POST** `/api/auth/login`

Logs in a verified user and returns tokens.

**Request Body:**
```json
{
  "email": "john@gmail.com",
  "password": "Test@1234"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@gmail.com",
    "role": "CUSTOMER",
    "profilePictureUrl": null
  }
}
```

**What to store after login:**
- `accessToken` → store in app memory/state (expires in 15 minutes)
- `refreshToken` → store in SecureStore/AsyncStorage (expires in 30 days)
- `user.id` → store in app state (use this as `userId` in all future requests)

---

### 4. Refresh Token
**POST** `/api/auth/refresh`

Gets a new access token when the current one expires. Call this when any API returns `401`.

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token-from-login"
}
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

**Important:** Replace both tokens in storage after this call.

---

## Shop Routes

### 5. Get Nearby Shops
**GET** `/api/shop/nearby?lat=25.5941&lng=85.1376&radiusKm=2`

Returns all registered shops within the given radius. This is the main screen for customers.

**Query Parameters:**
| Param | Required | Description |
|---|---|---|
| `lat` | Yes | Customer's current latitude |
| `lng` | Yes | Customer's current longitude |
| `radiusKm` | No | Search radius in km (default: 2) |

**No request body needed.**

**Success Response (200):**
```json
{
  "message": "Nearby shops fetched successfully",
  "total": 2,
  "shops": [
    {
      "id": "shop-uuid",
      "shopName": "Classic Cuts",
      "address": "123 Main Street",
      "city": "Patna",
      "state": "Bihar",
      "avgRating": 4.5,
      "totalReviews": 20,
      "distanceKm": 0.8,
      "shopHours": [
        { "dayOfWeek": 0, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
        { "dayOfWeek": 6, "opensAt": "00:00", "closesAt": "00:00", "isClosed": true }
      ],
      "services": [
        {
          "id": "service-uuid",
          "name": "Haircut",
          "price": 150,
          "durationMinutes": 30
        }
      ],
      "barbers": [
        {
          "id": "barber-profile-uuid",
          "bio": "Expert barber",
          "avgRating": 4.8,
          "experienceYears": 5,
          "user": {
            "firstName": "Rahul",
            "lastName": "Kumar",
            "profilePictureUrl": null
          }
        }
      ]
    }
  ]
}
```

**dayOfWeek mapping:** 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday

**For booking, save from this response:**
- `shop.id` → use as `shopId`
- `shop.services[].id` → use as `serviceId`
- `shop.barbers[].id` → use as `barberId`

---

### 6. Create Shop (Barber only)
**POST** `/api/shop/create-shop`

Creates a new barber shop. Only users with `role: BARBER` can do this.

**Request Body:**
```json
{
  "id": "barber-user-id",
  "shopName": "Classic Cuts",
  "description": "Best barber in town",
  "address": "123 Main Street",
  "pincode": "800001",
  "city": "Patna",
  "state": "Bihar",
  "locationLat": 25.5941,
  "locationLng": 85.1376
}
```

**Success Response (200):**
```json
{
  "message": "Shop created successfully",
  "shop": {
    "id": "shop-uuid",
    "shopName": "Classic Cuts",
    "ownerId": "barber-user-id"
  }
}
```

---

### 7. Update Shop (Barber only)
**PUT** `/api/shop/update-shop`

Updates shop details. Only send the fields you want to change.

**Request Body:**
```json
{
  "id": "shop-uuid",
  "ownerId": "barber-user-id",
  "shopName": "Classic Cuts Updated",
  "description": "Updated description",
  "isOpen": true
}
```

All fields except `id` and `ownerId` are optional — only send what needs updating.

---

### 8. Add Shop Hours (Barber only)
**POST** `/api/shop/add-hours`

Sets opening hours for each day of the week. Can be called again to update.

**Request Body:**
```json
{
  "shopId": "shop-uuid",
  "ownerId": "barber-user-id",
  "hours": [
    { "dayOfWeek": 0, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 1, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 2, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 3, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 4, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 5, "opensAt": "09:00", "closesAt": "20:00", "isClosed": false },
    { "dayOfWeek": 6, "opensAt": "00:00", "closesAt": "00:00", "isClosed": true }
  ]
}
```

You can send 1-7 days. For closed days set `isClosed: true` and any value for `opensAt`/`closesAt`.

---

### 9. Add Service (Barber only)
**POST** `/api/shop/add-service`

Adds a service to the shop (haircut, shave, etc).

**Request Body:**
```json
{
  "shopId": "shop-uuid",
  "ownerId": "barber-user-id",
  "name": "Haircut",
  "description": "Regular haircut with scissors",
  "price": 150,
  "durationMinutes": 30
}
```

`description` is optional. Call this route for each service you want to add.

---

## Appointment Routes

### 10. Book Appointment (Customer only)
**POST** `/api/appointment/book`

Books an appointment at a shop.

**Where to get the IDs:**
- `customerId` → from login response (`user.id`)
- `shopId` → from nearby shops response (`shop.id`)
- `barberId` → from nearby shops response (`shop.barbers[].id`)
- `serviceId` → from nearby shops response (`shop.services[].id`)

**Request Body:**
```json
{
  "customerId": "customer-user-id",
  "barberId": "barber-profile-uuid",
  "shopId": "shop-uuid",
  "serviceId": "service-uuid",
  "scheduledAt": "2026-06-20T10:00:00.000Z"
}
```

`scheduledAt` must be a future date in ISO format.

**Success Response (201):**
```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "id": "appointment-uuid",
    "status": "PENDING",
    "scheduledAt": "2026-06-20T10:00:00.000Z",
    "priceAtBooking": 150,
    "service": { "name": "Haircut", "price": 150, "durationMinutes": 30 },
    "shop": { "shopName": "Classic Cuts", "address": "123 Main Street" },
    "barber": { "user": { "firstName": "Rahul", "lastName": "Kumar" } }
  }
}
```

---

### 11. Cancel Appointment (Customer only)
**PUT** `/api/appointment/cancel`

Cancels a pending or confirmed appointment.

**Request Body:**
```json
{
  "customerId": "customer-user-id",
  "appointmentId": "appointment-uuid",
  "cancellationReason": "Something came up"
}
```

Cannot cancel appointments with status: `COMPLETED`, `IN_PROGRESS`, `NO_SHOW`, or already `CANCELLED`.

---

### 12. Update Appointment Status (Barber only)
**PUT** `/api/appointment/status`

Barber updates the status of an appointment.

**Request Body:**
```json
{
  "appointmentId": "appointment-uuid",
  "barberId": "barber-profile-uuid",
  "status": "CONFIRMED",
  "cancellationReason": "Required only when status is CANCELLED"
}
```

**Valid status flow:**
```
PENDING → CONFIRMED or CANCELLED
CONFIRMED → IN_PROGRESS or CANCELLED or NO_SHOW
IN_PROGRESS → COMPLETED
COMPLETED → (final, cannot change)
CANCELLED → (final, cannot change)
```

**barberId** here is the barber's profile ID, not user ID. Get it from the appointment details.

---

### 13. Get Customer Appointments
**POST** `/api/appointment/customer`

Returns all appointments for a customer, split into upcoming and past.

**Request Body:**
```json
{
  "customerId": "customer-user-id"
}
```

Optionally filter by status:
```json
{
  "customerId": "customer-user-id",
  "status": "PENDING"
}
```

**Status options:** `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

**Success Response (200):**
```json
{
  "total": 3,
  "upcoming": [
    {
      "id": "appointment-uuid",
      "status": "CONFIRMED",
      "scheduledAt": "2026-06-20T10:00:00.000Z",
      "priceAtBooking": 150,
      "service": { "name": "Haircut" },
      "shop": { "shopName": "Classic Cuts", "city": "Patna" },
      "barber": { "user": { "firstName": "Rahul" } },
      "review": null
    }
  ],
  "past": [
    {
      "id": "appointment-uuid",
      "status": "COMPLETED",
      "review": {
        "shopRating": 5,
        "barberRating": 4,
        "comment": "Great service!"
      }
    }
  ]
}
```

---

### 14. Get Shop Appointments (Barber only)
**POST** `/api/appointment/shop`

Returns all appointments for a shop.

**Request Body:**
```json
{
  "shopId": "shop-uuid",
  "ownerId": "barber-user-id"
}
```

Optionally filter by status or date:
```json
{
  "shopId": "shop-uuid",
  "ownerId": "barber-user-id",
  "status": "CONFIRMED",
  "date": "2026-06-20"
}
```

---

## Review Routes

### 15. Create Review (Customer only)
**POST** `/api/review/create`

Submit a review after a completed appointment. Only works when appointment status is `COMPLETED`.

**Request Body:**
```json
{
  "customerId": "customer-user-id",
  "appointmentId": "appointment-uuid",
  "shopRating": 5,
  "barberRating": 4,
  "comment": "Great service, will come again!"
}
```

`comment` is optional. Ratings must be between 1 and 5. One review per appointment only.

---

### 16. Get Shop Reviews
**POST** `/api/review/shop`

Returns all reviews for a shop.

**Request Body:**
```json
{
  "shopId": "shop-uuid"
}
```

**Success Response (200):**
```json
{
  "shop": {
    "shopName": "Classic Cuts",
    "avgRating": 4.5,
    "totalReviews": 20
  },
  "totalReviews": 20,
  "reviews": [
    {
      "shopRating": 5,
      "barberRating": 4,
      "comment": "Great service!",
      "createdAt": "2026-06-10T12:00:00.000Z",
      "appointment": {
        "customer": {
          "user": {
            "firstName": "John",
            "lastName": "Doe",
            "profilePictureUrl": null
          }
        }
      }
    }
  ]
}
```

---

## User Profile Routes

### 17. Get Profile
**GET** `/api/auth/profile`

Returns full user profile with all related data.

**Request Body:**
```json
{
  "userId": "user-uuid"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@gmail.com",
    "role": "CUSTOMER",
    "customerProfile": {
      "desiredDistanceKm": 5.0,
      "locationLat": null,
      "locationLng": null
    },
    "barberProfile": null,
    "ownedShops": []
  }
}
```

For a `BARBER` user the response includes `barberProfile` and `ownedShops`.

---

### 18. Update Profile
**PUT** `/api/auth/profile`

Updates user profile. Only send the fields you want to change.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "firstName": "John",
  "lastName": "Updated",
  "phoneNumber": "9876543210",
  "gender": "Male",
  "dateOfBirth": "1995-06-15",
  "address": "New Address",
  "pincode": "800001",
  "profilePictureUrl": "https://example.com/photo.jpg"
}
```

For **CUSTOMER** additionally:
```json
{
  "userId": "user-uuid",
  "desiredDistanceKm": 5.0
}
```

For **BARBER** additionally:
```json
{
  "userId": "user-uuid",
  "bio": "Expert barber with 5 years experience",
  "experienceYears": 5
}
```

---

## Full Booking Flow

Here is the complete flow from customer opening the app to booking an appointment:

```
Step 1: Login
POST /api/auth/login
→ save user.id, accessToken, refreshToken

Step 2: Get nearby shops (pass current GPS coordinates)
GET /api/shop/nearby?lat=25.5941&lng=85.1376&radiusKm=2
→ save shop.id, service.id, barber.id from response

Step 3: Book appointment
POST /api/appointment/book
{
  "customerId": "user.id from Step 1",
  "shopId": "shop.id from Step 2",
  "serviceId": "service.id from Step 2",
  "barberId": "barber.id from Step 2",
  "scheduledAt": "2026-06-20T10:00:00.000Z"
}

Step 4: View appointments
POST /api/appointment/customer
{ "customerId": "user.id" }

Step 5: After appointment is COMPLETED, leave review
POST /api/review/create
{
  "customerId": "user.id",
  "appointmentId": "appointment.id from Step 4",
  "shopRating": 5,
  "barberRating": 4,
  "comment": "Great!"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "message": "Description of what went wrong"
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — invalid or expired token |
| 403 | Forbidden — wrong role or account suspended |
| 404 | Not found — resource doesn't exist |
| 409 | Conflict — already exists (duplicate email, existing shop, etc) |
| 500 | Server error — something went wrong on backend |

---

## Token Handling

```
Access token expires in 15 minutes.
When any API returns 401:
  → Call POST /api/auth/refresh with your refreshToken
  → Replace both tokens in storage
  → Retry the original request

Refresh token expires in 30 days.
If refresh also returns 401:
  → User must login again
```

---

## Complete Route Summary

| Method | Route | Who can call | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Anyone | Create account |
| POST | `/api/auth/verify` | Anyone | Verify OTP |
| POST | `/api/auth/login` | Anyone | Login |
| POST | `/api/auth/refresh` | Anyone | Refresh token |
| GET | `/api/auth/profile` | Any logged in | Get profile |
| PUT | `/api/auth/profile` | Any logged in | Update profile |
| GET | `/api/shop/nearby` | Customer | Get nearby shops |
| POST | `/api/shop/create-shop` | Barber | Create shop |
| PUT | `/api/shop/update-shop` | Barber | Update shop |
| POST | `/api/shop/add-hours` | Barber | Set shop hours |
| POST | `/api/shop/add-service` | Barber | Add service |
| POST | `/api/appointment/book` | Customer | Book appointment |
| PUT | `/api/appointment/cancel` | Customer | Cancel appointment |
| PUT | `/api/appointment/status` | Barber | Update status |
| POST | `/api/appointment/customer` | Customer | Get my appointments |
| POST | `/api/appointment/shop` | Barber | Get shop appointments |
| POST | `/api/review/create` | Customer | Submit review |
| POST | `/api/review/shop` | Anyone | Get shop reviews |
