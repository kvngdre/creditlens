module.exports = {
    loanStatus: {
        approved: 'Approved',
        deny: 'Denied',
        pending: 'Pending',
        hold: 'On Hold',
        liq: 'Liquidated',
        disc: 'Discontinued',
        matured: 'Matured',
    },
    loanRemarks: [
        'Duplicate request',
        'Ok for disbursement',
        'Net pay below threshold',
        'Inconsistent net pay',
        'Incorrect IPPIS number',
        'Confirm recommended loan amount',
        'Confirm recommended tenor',
        'Confirm account number',
        'Confirm BVN',
        'Confirm BVN and account number',
        'Age above threshold',
        'Length of service above threshold',
        'Bad loan with other institution',
        'Department not eligible',
        'Negative net pay',
        'Not eligible for top up',
        'High exposure',
        'Name mismatch',
        'Net pay not available',
        'Client discontinued',
        'Failed to provide valid documentation',
    ],
    maritalStatus: [
        'Single',
        'Married',
        'Divorced',
        'Separated',
        'Widow',
        'Widower',
    ],
    roles: {
        admin: 'Admin',
        agent: 'Agent',
        credit: 'Credit',
        master: 'Master',
        operations: 'Operations',
        owner: 'Owner',
        // support: 'Support',
    },
    relationships: [
        'Daughter',
        'Brother',
        'Cousin',
        'Father',
        'Mother',
        'Nephew',
        'Sister',
        'Spouse',
        'Niece',
        'Son',
    ],
    sort_fields: {
        'asc': 'createdAt',
        'desc': '-createdAt',
        'first': 'name.first',
        'last': 'name.last'
    },
    txnStatus: {
        abandoned: 'Abandoned',
        failed: 'Failed',
        pending: 'Pending',
        success: 'Successful',
    },
    validIds: [
        'Voters card',
        'International passport',
        'Staff ID card',
        'National ID card',
        "Driver's license",
    ],
    
};
