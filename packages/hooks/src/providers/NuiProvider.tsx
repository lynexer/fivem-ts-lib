'use client';

import React, { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { NuiContext, type NUIContext } from '../contexts/NuiContext';

export interface NuiEvent<T> {
    type: string;
    resource: string;
    payload: T;
}

export interface NuiProviderProps {
    debug?: boolean;
    context?: React.Context<NUIContext>;
    validateEvent?: (event: MessageEvent) => boolean;
}

export const NuiProvider: React.FC<PropsWithChildren<NuiProviderProps>> = ({
    debug: debugEnabled,
    children,
    context = NuiContext,
    validateEvent
}) => {
    const handlers = useRef<Record<string, ((event: MessageEvent) => void)[]>>({});

    const debug = useCallback(
        (...args: unknown[]) => {
            if (debugEnabled) {
                console.debug('[NuiProvider]', ...args);
            }
        },
        [debugEnabled]
    );

    const addHandler: NUIContext['addHandler'] = (event, handler) => {
        debug('Adding handler for event:', event);
        handlers.current[event] = [...(handlers.current[event] ?? []), handler];
    };

    const removeHandler: NUIContext['removeHandler'] = (event, handler) => {
        handlers.current[event] = (handlers.current[event] ?? []).filter(
            (existingHandler) => existingHandler !== handler
        );
    };

    useEffect(() => {
        const eventHandler = (event: MessageEvent) => {
            debug('Received event:', event);

            if (validateEvent && !validateEvent(event)) {
                debug('Event validation failed:', event);
                return;
            }

            const data = event.data as NuiEvent<unknown>;
            const { type } = data;

            const relevantHandlers = handlers.current[type] ?? [];

            if (relevantHandlers.length > 0) {
                debug(`Invoking ${relevantHandlers.length} handler(s) for event type:`, type);
                relevantHandlers.forEach((handler) => handler(event));
            }
        };

        window.addEventListener('message', eventHandler);
        return () => window.removeEventListener('message', eventHandler);
    }, []);

    return <context.Provider value={{ addHandler, removeHandler }}>{children}</context.Provider>;
};
