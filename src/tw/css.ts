import type React from "react";
import { useCssElement as useCssElementImpl } from "react-native-css";

// react-native-css types useCssElement with `const C` / StyledConfiguration<C>
// generics that blow TS's union-size limit (TS2590) against RN 0.86's
// generated component types. The wrappers in this folder declare their own
// public prop types, so collapse the generic to a simple signature here.
// Runtime is untouched — this is the same function.
export const useCssElement = useCssElementImpl as (
  component: React.ElementType,
  props: object,
  mapping: Record<string, string>,
) => React.ReactElement;
