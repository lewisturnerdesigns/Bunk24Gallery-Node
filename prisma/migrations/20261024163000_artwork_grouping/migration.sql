ALTER TABLE `Artwork`
  ADD COLUMN `groupKey` VARCHAR(191) NULL,
  ADD INDEX `Artwork_groupKey_idx` (`groupKey`);
