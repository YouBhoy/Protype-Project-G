# TODO - OGC Facilitator Dashboard tab button functionality

- [x] Inspect current FacilitatorDashboardPage tab buttons and content rendering
- [x] Refactor tab bar in `frontend/src/pages/FacilitatorDashboardPage.jsx` to use `activeTab` state (analytics/slots/appointments/emergency) instead of `<Link>` navigation
- [x] Ensure content sections for Slots, Appointments, and Emergency Contacts exist and render conditionally based on `activeTab`
- [ ] Wire “Load Analytics” button to refresh analytics data for the current dashboard
- [ ] Verify no visual/layout/style changes beyond button functionality
- [ ] Quick runtime check: switch tabs and confirm content updates without redirect


