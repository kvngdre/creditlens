const User = require('../models/userModel');

module.exports = async (lenderId, role, segmentId) => {
    const users = await User.find( { lenderId, role, active: true, emailVerified: true, segments: segmentId } )
    const randomIndex = Math.floor(Math.random() * users.length)
    
    return users[randomIndex];
};

// module.exports = pickAgentId;