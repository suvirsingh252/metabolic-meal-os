import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Home,
  Sparkles,
  MessageSquare,
  ShoppingCart,
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
    label: "Tonight",
    icon: Home
  },
  {
    href: "/dashboard",
    label: "Insights",
    icon: Sparkles
  },
  {
    href: "/planner",
    label: "Planner",
    icon: CalendarDays
  },
  {
    href: "/grocery",
    label: "Shop",
    icon: ShoppingCart
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
    label: "Notes",
    icon: MessageSquare
  },
  {
    href: "/settings",
    label: "More",
    icon: Settings
  }
];
