module.exports = (existing, local) => {
    // Compare type
    const localType = local.type ?? 1;
    if (existing.type !== localType) return true;

    // Slash command comparison (name, description, options)
    if (localType === 1) {
        if (existing.description !== local.description) return true;

        const existingOptions = existing.options ?? [];
        const localOptions = local.options ?? [];

        if (existingOptions.length !== localOptions.length) return true;

        // Compare options deeply
        for (let i = 0; i < localOptions.length; i++) {
            const A = localOptions[i];
            const B = existingOptions.find(o => o.name === A.name);
            if (!B) return true;

            if (
                A.description !== B.description ||
                A.type !== B.type ||
                (A.required ?? false) !== (B.required ?? false)
            ) {
                return true;
            }
        }
    }

    // Context menu commands only need: name + type
    return false;
};
