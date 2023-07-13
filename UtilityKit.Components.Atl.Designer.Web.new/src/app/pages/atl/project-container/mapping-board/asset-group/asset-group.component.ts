import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import {
  AssetGroup,
  AssetTable,
  Network,
  NetworkTypeEnum,
  UNDProject,
} from 'src/app/pages/models/atl-project-model';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import * as _lodash from 'lodash';
import { NgxSpinnerService } from 'ngx-spinner';
import { AtlProjectService } from 'src/app/pages/services/atl-project.service';
import { MapRecordService } from 'src/app/pages/services/map-record.service';
import {
  AssetGroupMappingData,
  AssetGroupMappingService,
} from '../../../../services/mapping-board.service';
import { NgbAccordionConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-asset-group',
  templateUrl: './asset-group.component.html',
  styleUrls: ['./asset-group.component.scss'],
  providers: [NgbAccordionConfig],
})
export class AssetGroupComponent implements OnInit {
  selectedNetworkId: string = '0';
  selectedAssetTableId: string = '0';
  selectedAssetGroupId: string = '0';

  networks: Network[] = [];
  assetTables: AssetTable[] = [];
  filteredAssetTables: AssetTable[] = [];
  assetGroups?: AssetGroup[] = [];

  uNDProjectId: any;
  undProject: UNDProject = new UNDProject();
  highlightedAssetGroupRow: number;
  atlProjectId: any;
  networkTypeEnum = NetworkTypeEnum;
  highlightedAssetTableRow: number;
  constructor(
    config: NgbAccordionConfig,
    private _activatedRoute: ActivatedRoute,
    private _aTLProjectService: AtlProjectService,
    private cdr: ChangeDetectorRef,
    private _router: Router,
    private _assetGroupMappingService: AssetGroupMappingService, // inject service
    private _mapRecordService: MapRecordService,
    private _spinnerService: NgxSpinnerService
  ) {
    config.closeOthers = true;
  }

  ngOnInit(): void {
    this.uNDProjectId = this._activatedRoute.snapshot.params['undId'];
    this.atlProjectId = this._activatedRoute.snapshot.params['atlId'];

    this.get(this.uNDProjectId);
  }

  get(uNDProjectId: string) {
    this._spinnerService.show();

    let undProjectObservable = this._aTLProjectService.getUND(uNDProjectId);
    let distinctAssetGroupIdsObservable =
      this._mapRecordService.getDistinctAssetGroupIds(this.atlProjectId);

    undProjectObservable
      .pipe(
        catchError((errorMessage) => {
          return of(errorMessage);
        }),
        finalize(() => {
          this._spinnerService.hide();
        }),
        switchMap((undProject: UNDProject) => {
          this.undProject = undProject;
          return distinctAssetGroupIdsObservable;
        })
      )
      .subscribe((distinctAssetGroupIds: string[]) => {
        this.networks.push(
          // this.undProject.structureNetwork,
          ...this.undProject.network
        );

        this.networks.forEach((element) => {
          this.filteredAssetTables.push(...element.assetTables);
        });

        this.filteredAssetTables.forEach((assetTable) => {
          assetTable.assetGroups.forEach((assetGroup) => {
            if (distinctAssetGroupIds.some((item) => item === assetGroup.id)) {
              assetGroup.isMapped = true;
            } else {
              assetGroup.isMapped = false;
            }
          });
        });

        const assetTablesCopy = JSON.parse(
          JSON.stringify(this.assetTables)
        ) as typeof this.assetTables;
        this.assetTables = assetTablesCopy;
        this.cdr.detectChanges();
        this._spinnerService.hide();
      });
  }

  onChangeNetwork(event: any) {
    let networkId = event.target.value;
    this.selectedAssetTableId = '0';
    this.selectedAssetGroupId = '0';

    this.assetTables = this.networks.find(
      (n) => n.id == networkId
    )!.assetTables;

    this.filteredAssetTables = this.assetTables;
  }

  onChangeAssetTable(event: any) {
    this.selectedAssetGroupId = '0';
    let assettableId = event.target.value;

    this.filteredAssetTables = this.assetTables?.filter(
      (fat) => fat.id == assettableId
    );

    this.assetGroups = this.assetTables?.find(
      (at) => at.id == assettableId
    )?.assetGroups;
  }

  onChangeAssetGroup(event: any) {
    let assetGroupId = event.target.value;
    this.selectedAssetTableId;

    const assetTablesCopy = JSON.parse(
      JSON.stringify(this.assetTables)
    ) as typeof this.assetTables;

    this.filteredAssetTables = assetTablesCopy?.filter(
      (fat) => fat.id == this.selectedAssetTableId
    );

    this.filteredAssetTables.find(
      (f) => f.id == this.selectedAssetTableId
    )!.assetGroups = this.filteredAssetTables
      .find((f) => f.id == this.selectedAssetTableId)!
      .assetGroups.filter((ag) => ag.id == assetGroupId);
  }

  onChangeOnlyMapped(event: any) {
    console.log(event);

    if (event) {
      const assetTablesCopy = JSON.parse(
        JSON.stringify(this.assetTables)
      ) as AssetTable[];

      this.filteredAssetTables = assetTablesCopy?.filter((ast) =>
        ast.assetGroups.filter((ag) => ag.isMapped == true)
      );
    } else {
      this.filteredAssetTables = JSON.parse(
        JSON.stringify(this.assetTables)
      ) as AssetTable[];
    }
  }

  onClickAssetGroup(
    assetGroup: AssetGroup,
    highlightedAssetGroup: number,
    highlightedAssetTable: number
  ) {
    this.highlightedAssetGroupRow = highlightedAssetGroup;
    this.highlightedAssetTableRow = highlightedAssetTable;

    this.sendToSubscriber(assetGroup);
    let url = `atl/project-container/${this.atlProjectId}/mapping-board/${this.uNDProjectId}/map-record/${assetGroup.id}/list`;
    this._router.navigateByUrl(url);
  }

  private sendToSubscriber(assetGroup: AssetGroup): void {
    let network = this.networks.find((n) =>
      n.assetTables.find((at) =>
        at.assetGroups.find((ag) => ag.id == assetGroup.id)
      )
    );
    let assetTable = this.networks
      .find((n) => n.assetTables.find((at) => at.id === assetGroup.aTid))
      ?.assetTables.find((at) => at.id === assetGroup.aTid);

    let assetGroupMappingData: AssetGroupMappingData =
      new AssetGroupMappingData();
    (assetGroupMappingData.networkId = network?.id),
      (assetGroupMappingData.networkName = network?.name!),
      (assetGroupMappingData.fields = _lodash.sortBy(assetTable?.fields, [
        'name',
      ])),
      (assetGroupMappingData.assetTableId = assetGroup.aTid),
      (assetGroupMappingData.assetTableName = assetTable?.name!),
      (assetGroupMappingData.assetGroupId = assetGroup.id),
      (assetGroupMappingData.assetGroupName = assetGroup.name),
      (assetGroupMappingData.assetGroupCode = assetGroup.code),
      (assetGroupMappingData.assetTypes = assetGroup.assetTypes),
      (assetGroupMappingData.aTLProjectId = this.atlProjectId),
      (assetGroupMappingData.assetTableType = assetTable?.tableTypeId!),
      (assetGroupMappingData.uNDProjectId = this.uNDProjectId),
      this._assetGroupMappingService.updateMessage(assetGroupMappingData);
  }

  viewExecutionPlan() {
    let url = `atl/project-mapping/${this.atlProjectId}/view-execution-plan`;
    this._router.navigateByUrl(url);
  }
}
