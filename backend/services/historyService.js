const db = require('../config/database');

const logHistory = async ({
    laptopId,
    userId,
    action,
    actionType,
    previousStatus,
    newStatus,
    details,
    ipAddress
}) => {
    const query = `
        INSERT INTO history_logs 
        (laptop_id, user_id, action, action_type, previous_status, new_status, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `;

    const values = [
        laptopId,
        userId,
        action,
        actionType,
        previousStatus,
        newStatus,
        details ? JSON.stringify(details) : null,
        ipAddress
    ];

    const result = await db.query(query, values);
    return result.rows[0];
};

const getLaptopHistory = async (laptopId, limit = 50, offset = 0) => {
    const query = `
        SELECT 
            h.*,
            u.full_name as user_name,
            u.role as user_role,
            l.serial_number
        FROM history_logs h
        LEFT JOIN users u ON h.user_id = u.id
        LEFT JOIN laptops l ON h.laptop_id = l.id
        WHERE h.laptop_id = $1
        ORDER BY h.created_at DESC
        LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [laptopId, limit, offset]);
    return result.rows;
};

const getAllHistory = async ({
    startDate,
    endDate,
    userId,
    actionType,
    limit = 100,
    offset = 0
}) => {
    let query = `
        SELECT 
            h.*,
            u.full_name as user_name,
            u.role as user_role,
            l.serial_number
        FROM history_logs h
        LEFT JOIN users u ON h.user_id = u.id
        LEFT JOIN laptops l ON h.laptop_id = l.id
        WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    if (startDate) {
        paramCount++;
        query += ` AND h.created_at >= $${paramCount}`;
        values.push(startDate);
    }

    if (endDate) {
        paramCount++;
        query += ` AND h.created_at <= $${paramCount}`;
        values.push(endDate);
    }

    if (userId) {
        paramCount++;
        query += ` AND h.user_id = $${paramCount}`;
        values.push(userId);
    }

    if (actionType) {
        paramCount++;
        query += ` AND h.action_type = $${paramCount}`;
        values.push(actionType);
    }

    paramCount++;
    query += ` ORDER BY h.created_at DESC LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
};

module.exports = {
    logHistory,
    getLaptopHistory,
    getAllHistory
};
