const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserProfiles,
  addProfile,
  updateProfile,
  deleteProfile,
  switchProfile,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/profileController');

router.get('/profiles', protect, getUserProfiles);
router.post('/profiles', protect, addProfile);
router.put('/profiles/:profileId', protect, updateProfile);
router.delete('/profiles/:profileId', protect, deleteProfile);
router.post('/profiles/switch/:profileIndex', protect, switchProfile);

router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
