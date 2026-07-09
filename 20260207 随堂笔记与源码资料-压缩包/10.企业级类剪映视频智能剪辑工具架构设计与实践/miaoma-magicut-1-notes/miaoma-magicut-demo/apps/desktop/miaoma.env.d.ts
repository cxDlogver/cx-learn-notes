interface Window {
    miaomaAPI: {
        ping: () => Promise<{ success: boolean }>;
    };
}
