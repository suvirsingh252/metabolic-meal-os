import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Home,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Utensils
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: Home
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/analyze",
    label: "Analyze",
    icon: BarChart3
  },
  {
    href: "/meals",
    label: "Meals",
    icon: Utensils
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: MessageSquare
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings
  }
];
