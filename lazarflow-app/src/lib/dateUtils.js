/**
 * Formats a date string or Date object into an alphanumeric format like "18th Mar 2026"
 * @param {string|Date} dateInput - The date to format
 * @param {boolean} shortMonth - Whether to use short month names (e.g., "Mar" vs "March")
 * @returns {string} - The formatted date string
 */
export const formatAlphanumericDate = (dateInput, shortMonth = true) => {
    if (!dateInput) return 'N/A';
    
    try {
        const date = new Date(dateInput);
        
        // Check for invalid date
        if (isNaN(date.getTime())) return 'N/A';
        
        const day = date.getDate();
        const year = date.getFullYear();
        
        const months = shortMonth 
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            
        const monthName = months[date.getMonth()];
        
        // Add ordinal suffix (st, nd, rd, th)
        const getOrdinalSuffix = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return (s[(v - 20) % 10] || s[v] || s[0]);
        };
        
        return `${day}${getOrdinalSuffix(day)} ${monthName} ${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};
