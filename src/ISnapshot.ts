export interface ISnapshot {
  view: ISnapshotView;
  projections: Array<ISnapshotProjection>;
  layers: Array<ISnapshotLayer>;
}

export interface ISnapshotView {
  center: [number, number];
  zoom: number;
  projectionCode: string;
}

export interface ISnapshotProjection {
  code: string;
  wkt?: string;
  lonLatValidity?: number[];
  name?: string;
  remarks?: string;
}

export interface ISnapshotLayer {
  getSourceTypeName: string;
  getSourceOptions: any;
  props: any;
}

export interface ISnapshotGetter {
  getSnapshot?: () => ISnapshot;
}
