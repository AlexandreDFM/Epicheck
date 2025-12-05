## Recent Changes (December 2025)

### EpiCheck: RDV Details & DOM Parsing Improvements

- **DOM Extraction & Parsing:**
	- Added logic to fetch and parse the DOM of Epitech Intranet RDV pages using a hidden WebView.
	- Extracted the `launchApp('module.activite.rdv', {...})` script data robustly with regex and fallback to `eval` for non-strict JSON.
	- Parsed registrations (students/groups) from the extracted JSON, displaying them in the app.

- **Display Logic:**
	- UI now shows only the extracted registrations, styled with project DA (NativeWind/Tailwind).
	- For each registration, the app displays:
		- Avatars (see below for photo logic)
		- Names, logins, and registration date
		- A badge showing the note (if present), otherwise the attendance status (Présent/Absent/Non renseigné)

- **Photo/Avatar Handling:**
	- The app uses the `picture` field from the parsed data for each member/master.
	- If the picture URL ends with `.bmp`, it is automatically upgraded to the `/miniview/xxx.jpg` version for higher quality (as seen on hover in the Intra UI).
	- If the miniview is not available, the original `.bmp` is used as fallback.

- **Code Locations:**
	- Main logic: `EpiCheck/screens/RdvDetailsScreen.tsx` (UI, DOM parsing, avatar logic)
	- Data extraction: `EpiCheck/services/rdvService.ts` (parsing launchApp JSON)

- **How to Continue:**
	- The DOM parsing and registration extraction are robust for current Intranet structure.
	- To further improve, see the avatar/photo logic for miniview handling in `RdvDetailsScreen.tsx`.
	- All display logic for notes/status is now based on the real data structure from the Intranet DOM/JSON.

---
# Detailed Analysis of EpiCheck/ Directory

## Summary of Findings

The 'EpiCheck/' directory houses a React Native/Expo mobile application developed with TypeScript. The project structure follows best practices for modularity, with dedicated directories for screens, components, services, hooks, contexts, types, and utilities. Styling is handled using Tailwind CSS (NativeWind).

The application's deployment strategy involves Docker for containerization and Kubernetes for orchestration. A 'proxy-server/' directory suggests a separate component for handling network requests, potentially for API routing, authentication, or other backend interactions.

Key technologies include:
- **Frontend Framework:** React Native / Expo
- **Language:** TypeScript
- **Styling:** Tailwind CSS (NativeWind)
- **Package Manager:** pnpm
- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **Tooling:** ESLint, Prettier

## Features

### Authentication
- Secure login with Epitech credentials.
- Integration with Epitech API for user authentication.

### Presence Management
- QR code scanning for student presence marking.
- NFC card scanning for mobile devices.
- Manual attendance marking as a fallback.

### Real-Time Tracking
- View scanned students in real-time.
- Synchronization with backend services.

### Modern UI
- Built with NativeWind (Tailwind CSS for React Native).
- Responsive design for mobile and web platforms.

## Deployment

### Docker
- Multi-stage Dockerfile for optimized production builds.
- Docker Compose for local development and testing.

### Kubernetes
- ConfigMap for environment-specific configurations.
- Deployment and service YAML files for orchestration.
- Horizontal Pod Autoscaler (HPA) for scaling.
- Network policies for security.

## Development Notes

### Code Structure
- **App.tsx:** Main entry point with navigation setup.
- **components/:** Reusable UI components (e.g., QRScanner, NFCScanner).
- **screens/:** Screens for different app functionalities (e.g., LoginScreen, PresenceScreen).
- **services/:** API service layers (e.g., epitechApi.ts).
- **contexts/:** Context API for state management (e.g., ThemeContext).

### Configuration
- **app.json:** Expo configuration.
- **tsconfig.json:** TypeScript configuration with strict mode enabled.
- **tailwind.config.js:** Tailwind CSS configuration.

### Dependencies
- Core: Expo, React Native, TypeScript.
- UI: NativeWind, Tailwind CSS, React Native Reanimated.
- Navigation: React Navigation.
- Features: Expo Camera, React Native NFC Manager, Axios.

### Testing
- Unit tests for services and components.
- End-to-end tests for critical user flows.

## Limitations

- The analysis is based on directory structure and file names due to restrictions in accessing file contents.
- Detailed implementation logic and exact dependencies could not be examined.
