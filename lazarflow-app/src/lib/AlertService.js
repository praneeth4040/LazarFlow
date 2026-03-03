import React from 'react';

export const globalAlertRef = React.createRef();

export const CustomAlert = {
    alert: (title, message, buttons, options) => {
        if (globalAlertRef.current) {
            globalAlertRef.current.alert(title, message, buttons, options);
        } else {
            console.warn('CustomAlert not mounted. Falling back to console.warn');
            console.warn(title, message);
        }
    }
};