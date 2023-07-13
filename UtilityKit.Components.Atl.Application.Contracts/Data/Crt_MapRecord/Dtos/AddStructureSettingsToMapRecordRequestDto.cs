﻿using UtilityKit.Components.Atl.Domain.BusinessModel.MetaData.ZContition;
using UtilityKit.Components.Atl.Domain.SharedKernel.Enum;

namespace UtilityKit.Components.Atl.Application.Contracts.Data.Crt_MapRecord.Dtos
{
    public class AddStructureSettingsToMapRecordRequestDto
    {
        public Guid MapRecordId { get; set; }
        public StructureSettingsDto? StructureSettingsJson { get; set; }

    }
}