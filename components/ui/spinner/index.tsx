'use client';
import { ActivityIndicator } from 'react-native';
import React from 'react';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';


// nativewind 5.0.0-preview.3 types can't resolve this mapping; runtime supports it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledActivityIndicator = styled(ActivityIndicator, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
} as any) as unknown as React.ComponentType<
  React.ComponentProps<typeof ActivityIndicator> & {
    className?: string;
    ref?: React.Ref<React.ComponentRef<typeof ActivityIndicator>>;
  }
>;
const spinnerStyle = tva({});

const Spinner = React.forwardRef<
  React.ComponentRef<typeof ActivityIndicator>,
  React.ComponentProps<typeof ActivityIndicator>
>(function Spinner(
  {
    className,
    color,
    focusable = false,
    'aria-label': ariaLabel = 'loading',
    ...props
  },
  ref
) {
  return (
    <StyledActivityIndicator
      ref={ref}
      focusable={focusable}
      aria-label={ariaLabel}
      {...props}
      color={color}
      className={spinnerStyle({ class: className })}
    />
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };
