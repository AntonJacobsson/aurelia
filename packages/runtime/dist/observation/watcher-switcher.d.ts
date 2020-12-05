import type { IWatcher } from '../observation';
export declare let watching: boolean;
export declare function pauseWatching(): void;
export declare function resumeWatching(): void;
export declare function currentWatcher(): IWatcher | null;
export declare function enterWatcher(watcher: IWatcher): void;
export declare function exitWatcher(watcher: IWatcher): void;
export declare const WatcherSwitcher: Readonly<{
    readonly current: IWatcher | null;
    readonly watching: boolean;
    enter: typeof enterWatcher;
    exit: typeof exitWatcher;
    pause: typeof pauseWatching;
    resume: typeof resumeWatching;
}>;
//# sourceMappingURL=watcher-switcher.d.ts.map