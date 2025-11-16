# Eventfy - Event Management Platform

A full-stack event management platform built with Angular frontend and .NET Core backend, featuring Auth0 authentication and event CRUD operations.

## Architecture

- **Frontend**: Angular 17 with Tailwind CSS
- **Backend**: .NET Core Web API with Entity Framework
- **Authentication**: Auth0
- **Database**: SQL Server

## Project Structure

```
enventfy/
├── Eventfy/                    # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── services/       # API and business logic services
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   ├── interceptors/   # HTTP interceptors
│   │   │   └── environments/   # Environment configurations
│   │   └── assets/
│   └── package.json
└── EventunBackend/             # .NET Core Backend
    ├── Controllers/            # API controllers
    ├── Models/                 # Entity models
    ├── DTOs/                   # Data transfer objects
    ├── Services/               # Business logic services
    └── appsettings.json        # Configuration
```

## Features

### Frontend Features
- **Event Browsing**: View and search events with filtering
- **Event Management**: Create, update, delete events (Owner role)
- **Shopping Cart**: Add events to cart and checkout
- **Authentication**: Auth0 integration with role-based access
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

### Backend Features
- **RESTful API**: Complete CRUD operations for events
- **Authentication**: JWT token validation with Auth0
- **Role-based Authorization**: User and Owner roles
- **Event Search**: Advanced search with multiple filters
- **CORS Configuration**: Configured for Angular frontend

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- .NET 8 SDK
- SQL Server (LocalDB or full instance)
- Auth0 account

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd EventunBackend
   ```

2. **Update connection string** in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Your SQL Server connection string"
     }
   }
   ```

3. **Configure Auth0** in `appsettings.json`:
   ```json
   {
     "Auth0": {
       "Domain": "your-auth0-domain.auth0.com",
       "Audience": "your-api-identifier",
       "ClientId": "your-client-id",
       "ClientSecret": "your-client-secret"
     }
   }
   ```

4. **Install dependencies and run**:
   ```bash
   dotnet restore
   dotnet ef database update  # If using migrations
   dotnet run
   ```

   The API will be available at `https://localhost:7217`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd Eventfy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update environment configuration** in `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'https://localhost:7217/api',
     auth0: {
       domain: 'your-auth0-domain.auth0.com',
       clientId: 'your-client-id',
       audience: 'your-api-identifier',
       redirectUri: window.location.origin + '/callback'
     }
   };
   ```

4. **Start development server**:
   ```bash
   ng serve
   ```

   The application will be available at `http://localhost:4200`

## API Endpoints

### Authentication Endpoints
- `GET /api/public` - Public endpoint (no auth required)
- `GET /api/private` - Private endpoint (auth required)
- `GET /api/user-profile` - Get user profile
- `POST /api/assign-owner-role` - Assign owner role (Owner only)

### Event Endpoints
- `GET /api/Event` - Get all events
- `GET /api/Event/{id}` - Get event by ID
- `POST /api/Event` - Create event (Owner only)
- `PUT /api/Event/{id}` - Update event (Owner only)
- `DELETE /api/Event/{id}` - Delete event (Owner only)
- `GET /api/Event/category/{category}` - Get events by category
- `POST /api/Event/search` - Search events
- `GET /api/Event/my-events` - Get current user's events

## Authentication Flow

1. User clicks login button
2. Redirected to Auth0 login page
3. After successful login, Auth0 redirects back with authorization code
4. Frontend exchanges code for JWT token
5. Token is stored and used for API requests
6. Backend validates JWT token on protected endpoints

## User Roles

- **User**: Can view events, add to cart, purchase tickets
- **Owner**: Can create, update, delete events + all User permissions

## Development

### Running in Development Mode

1. Start the backend:
   ```bash
   cd EventunBackend
   dotnet run
   ```

2. Start the frontend:
   ```bash
   cd Eventfy
   ng serve
   ```

### Building for Production

1. Build the frontend:
   ```bash
   cd Eventfy
   ng build --configuration production
   ```

2. Build the backend:
   ```bash
   cd EventunBackend
   dotnet publish -c Release
   ```

## Key Integration Points

### HTTP Interceptor
- Automatically adds JWT token to API requests
- Located in `src/app/interceptors/auth.interceptor.ts`

### Services
- **ApiService**: Handles all HTTP requests to backend
- **AuthService**: Manages authentication state and Auth0 integration
- **EventService**: Business logic for event operations

### Models
- TypeScript interfaces match backend DTOs
- Located in `src/app/models/`

## Troubleshooting

### CORS Issues
- Ensure Angular dev server URL is in backend CORS configuration
- Check `appsettings.json` AllowedOrigins

### Authentication Issues
- Verify Auth0 configuration matches between frontend and backend
- Check JWT token format and expiration
- Ensure API audience is correctly configured

### Database Issues
- Verify connection string is correct
- Run database migrations if using Entity Framework
- Check SQL Server is running

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
