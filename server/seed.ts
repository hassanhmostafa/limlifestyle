/**
 * Seed file for kiosk test data.
 *
 * This file contains the initial test data for Jeddah kiosk locations.
 * When you are ready to switch to real data:
 *   1. Replace the entries below with your actual kiosk records, OR
 *   2. Clear the `kiosks` table and insert real records via the admin dashboard, OR
 *   3. Connect a real-time data source and remove the seed entirely.
 *
 * The seed is applied automatically on server start (see server/_core/index.ts).
 * It uses INSERT ... ON DUPLICATE KEY UPDATE so re-running is always safe.
 */

import { InsertKiosk } from "../drizzle/schema";

export const SEED_KIOSKS: InsertKiosk[] = [
  {
    id: "kiosk-001",
    name: "Red Sea Mall Health Station",
    location: "Red Sea Mall",
    address: "King Abdulaziz Road, Red Sea Mall, Jeddah",
    latitude: "21.5433000",
    longitude: "39.1726000",
    phone: "+966 12 645 8888",
    email: "redsea@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/hero-health-kiosk-5mwyXD2eAKfFKPmEnVJdix.webp",
    rating: "4.8",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Sunday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Monday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Tuesday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Wednesday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Thursday", open: "10:00 AM", close: "11:00 PM" },
      { day: "Friday", open: "12:00 PM", close: "11:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Health Risk Assessment"],
  },
  {
    id: "kiosk-002",
    name: "Jeddah Corniche Wellness Center",
    location: "Jeddah Corniche",
    address: "Corniche Road, Near Al Noor Mosque, Jeddah",
    latitude: "21.5239000",
    longitude: "39.1714000",
    phone: "+966 12 652 3333",
    email: "corniche@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/health-metrics-visual-M3LugxJgaMsdLyecxjVXzc.webp",
    rating: "4.9",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Sunday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Monday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Tuesday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Wednesday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Thursday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Friday", open: "10:00 AM", close: "10:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Diabetes Risk Screening"],
  },
  {
    id: "kiosk-003",
    name: "Tahlia Street Medical Hub",
    location: "Tahlia Street",
    address: "Tahlia Street, Downtown Jeddah",
    latitude: "21.5436000",
    longitude: "39.1572000",
    phone: "+966 12 667 5555",
    email: "tahlia@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/hero-health-kiosk-5mwyXD2eAKfFKPmEnVJdix.webp",
    rating: "4.7",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Sunday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Monday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Tuesday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Wednesday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Thursday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Friday", open: "11:00 AM", close: "09:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Cardiovascular Risk Assessment"],
  },
  {
    id: "kiosk-004",
    name: "Balad Historic District Health Point",
    location: "Al Balad",
    address: "Souq Al Alawi, Al Balad, Jeddah",
    latitude: "21.4834000",
    longitude: "39.1859000",
    phone: "+966 12 642 1111",
    email: "balad@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/health-metrics-visual-M3LugxJgaMsdLyecxjVXzc.webp",
    rating: "4.6",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Sunday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Monday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Tuesday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Wednesday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Thursday", open: "08:00 AM", close: "08:00 PM" },
      { day: "Friday", open: "10:00 AM", close: "08:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Wellness Assessment"],
  },
  {
    id: "kiosk-005",
    name: "North Jeddah Medical Center",
    location: "North Jeddah",
    address: "Prince Sultan Road, North Jeddah",
    latitude: "21.6289000",
    longitude: "39.1234000",
    phone: "+966 12 698 7777",
    email: "north@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/hero-health-kiosk-5mwyXD2eAKfFKPmEnVJdix.webp",
    rating: "4.8",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Sunday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Monday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Tuesday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Wednesday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Thursday", open: "09:00 AM", close: "10:00 PM" },
      { day: "Friday", open: "12:00 PM", close: "10:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Health Risk Assessment"],
  },
  {
    id: "kiosk-006",
    name: "South Jeddah Wellness Kiosk",
    location: "South Jeddah",
    address: "Madina Road, South Jeddah",
    latitude: "21.4234000",
    longitude: "39.1456000",
    phone: "+966 12 634 2222",
    email: "south@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/health-metrics-visual-M3LugxJgaMsdLyecxjVXzc.webp",
    rating: "4.5",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Sunday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Monday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Tuesday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Wednesday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Thursday", open: "10:00 AM", close: "09:00 PM" },
      { day: "Friday", open: "12:00 PM", close: "09:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Diabetes Screening"],
  },
  {
    id: "kiosk-007",
    name: "Obhur Health Station",
    location: "Obhur",
    address: "Obhur Main Street, Jeddah",
    latitude: "21.7234000",
    longitude: "39.0856000",
    phone: "+966 12 689 4444",
    email: "obhur@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/hero-health-kiosk-5mwyXD2eAKfFKPmEnVJdix.webp",
    rating: "4.7",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Sunday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Monday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Tuesday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Wednesday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Thursday", open: "08:00 AM", close: "10:00 PM" },
      { day: "Friday", open: "10:00 AM", close: "10:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Cardiovascular Assessment"],
  },
  {
    id: "kiosk-008",
    name: "Al Nuzha Pharmacy Health Hub",
    location: "Al Nuzha",
    address: "Al Nuzha District, Jeddah",
    latitude: "21.5834000",
    longitude: "39.2156000",
    phone: "+966 12 671 6666",
    email: "nuzha@techcare.com",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/health-metrics-visual-M3LugxJgaMsdLyecxjVXzc.webp",
    rating: "4.8",
    isActive: "true",
    hours: [
      { day: "Saturday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Sunday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Monday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Tuesday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Wednesday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Thursday", open: "09:00 AM", close: "09:00 PM" },
      { day: "Friday", open: "11:00 AM", close: "09:00 PM" },
    ],
    services: ["Blood Pressure", "Weight & BMI", "Heart Rate", "Temperature", "Health Risk Assessment"],
  },
];
