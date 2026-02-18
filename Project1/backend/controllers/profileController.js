const User = require('../models/User');

// @desc    Get user profiles
// @route   GET /api/profile/profiles
// @access  Private
exports.getUserProfiles = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      profiles: user.profiles,
      activeProfile: user.activeProfile
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new profile
// @route   POST /api/profile/profiles
// @access  Private
exports.addProfile = async (req, res, next) => {
  try {
    const { name, age, gender, preferences, measurements } = req.body;

    const user = await User.findById(req.user.id);

    user.profiles.push({
      name,
      age,
      gender,
      preferences,
      measurements
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Profile added',
      profiles: user.profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/profile/profiles/:profileId
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = user.profiles.id(req.params.profileId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    Object.assign(profile, req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      profiles: user.profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete profile
// @route   DELETE /api/profile/profiles/:profileId
// @access  Private
exports.deleteProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.profiles.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only profile'
      });
    }

    user.profiles.pull(req.params.profileId);
    
    // Adjust active profile index if needed
    if (user.activeProfile >= user.profiles.length) {
      user.activeProfile = 0;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile deleted',
      profiles: user.profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Switch active profile
// @route   POST /api/profile/profiles/switch/:profileIndex
// @access  Private
exports.switchProfile = async (req, res, next) => {
  try {
    const profileIndex = parseInt(req.params.profileIndex);
    const user = await User.findById(req.user.id);

    if (profileIndex < 0 || profileIndex >= user.profiles.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile index'
      });
    }

    user.activeProfile = profileIndex;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Switched to ${user.profiles[profileIndex].name}'s profile`,
      activeProfile: user.activeProfile,
      profile: user.profiles[profileIndex]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add address
// @route   POST /api/profile/addresses
// @access  Private
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // If this is marked as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/profile/addresses/:addressId
// @access  Private
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If this is being set as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/profile/addresses/:addressId
// @access  Private
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses.pull(req.params.addressId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};
