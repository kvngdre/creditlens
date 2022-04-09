const router = require('express').Router();
const debug = require('debug')('app:bankRoutes');
const verifyRole  = require('../middleware/verifyRole');
const verifyToken = require('../middleware/verifyToken');
const bankValidators = require('../validators/bankValidator')
const bankController = require('../controllers/banksController');


router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
    const { error } = bankValidators.validateCreation(req.body);
    if(error) return res.status(400).send(error.details[0].message);

    const newBank = await bankController.create(req.body);
    if(newBank instanceof Error) {
        debug(newBank);
        return res.status(400).send(newBank.message); };
    
    res.status(201).send(newBank);
});

router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
    const banks = await bankController.getAll();
    if(banks.length === 0) return res.status(404).send('No banks found.');

    res.status(200).send(banks);
});

router.get('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    const bank = await bankController.get(req.params.id);
    if(bank instanceof Error) {
        debug(bank);
        return res.status(400).send('Bank not found.');
    };

    res.status(200).send(bank);
});

router.patch('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    const { error } = bankValidators.validateEdit(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    
    const bank = await bankController.update(req.params.id, req.body); 
    if(bank instanceof Error) {
        debug(bank);
        return res.status(400).send(banks.message);
    };
    
    res.status(200).send(bank);
});


router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    const deletedBank = await bankController.delete(req.params.id);
    if(deletedBank instanceof Error) return res.status(401).send(deletedBank.message);

    res.status(200).send(deletedBank);
});

module.exports = router;
