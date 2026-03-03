const express = require('express');
const router = express.Router();
const { getPersonas, getPersonaById, createPersona, updatePersona } = require('../controllers/personas.controller');

router.get('/', getPersonas);
router.get('/:id', getPersonaById);
router.post('/', createPersona);
router.put('/:id', updatePersona);

module.exports = router;