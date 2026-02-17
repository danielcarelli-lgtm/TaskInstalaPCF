/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import * as React from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

export interface ITaskItem {
    id: string; originalId?: string; idTarea: string; nombre: string; inicio: string;
    fin: string; esfuerzo: string; imputadas: string; progreso: number; 
    estado: string; parentId?: string; 
    depName?: string; depId?: string; 
    entityName: string;
    virtualNro: number; 
    rawInicio: Date | null; 
    rawFin: Date | null;
}

export interface IHelloWorldProps { 
    tasks: ITaskItem[]; 
    version: string;
    dependenciaFechas: boolean;
    context: ComponentFramework.Context<any>; 
    onOpenTask: (etn: string, id: string) => void;
    onCreateTask: () => void;
    onUpdateProgreso: (id: string, val: number) => void;
    onReparentTask: (childId: string, newParentId: string) => void;
    onUnparentTask: (childId: string) => void;
    onUpdateDependency: (taskId: string, dependencyId: string | null) => void;
    onUpdateDates: (id: string, start: Date, end: Date) => void;
}

interface IHelloWorldState {
    collapsedParents: string[];
    activeView: 'grid' | 'gantt';
    ganttViewMode: ViewMode;
    hasError: boolean;
    errorMsg: string;
}

// === FACEPILE ===
interface IMemberFacepileProps { taskId: string, webAPI: ComponentFramework.WebApi }
interface IMemberFacepileState { members: string[], loading: boolean }
class MemberFacepile extends React.Component<IMemberFacepileProps, IMemberFacepileState> {
    constructor(props: IMemberFacepileProps) {
        super(props);
        this.state = { members: [], loading: true };
    }
    componentDidMount() { this.fetchMembers(); }
    componentDidUpdate(prevProps: IMemberFacepileProps) {
        if (prevProps.taskId !== this.props.taskId) this.fetchMembers();
    }
    private fetchMembers = () => {
        this.setState({ loading: true });
        const fetchXml = `
        <fetch version="1.0" mapping="logical" no-lock="false" distinct="true">
            <entity name="sec_miembrodelequipo">
                <attribute name="sec_name"/>
                <filter type="and">
                    <condition attribute="statecode" operator="eq" value="0"/>
                    <condition attribute="sec_tareadeproyectoid" operator="eq" value="${this.props.taskId}"/>
                </filter>
            </entity>
        </fetch>`;
        const query = `?fetchXml=${encodeURIComponent(fetchXml)}`;
        this.props.webAPI.retrieveMultipleRecords("sec_miembrodelequipo", query).then(
            (result: any) => {
                const names = result.entities.map((e: any) => e.sec_name);
                this.setState({ members: names, loading: false });
            },
            () => { this.setState({ loading: false }); }
        );
    };
    render() {
        if (this.state.loading) return <span style={{fontSize:'9px', color:'#ccc'}}>...</span>;
        if (this.state.members.length === 0) return null;
        return (
            <div className="members-container">
                {this.state.members.slice(0, 3).map((name, i) => {
                    const initials = name ? name.substring(0, 2).toUpperCase() : "?";
                    const colors = ['#0078d4', '#498205', '#a4262c', '#69797e', '#4f6bed'];
                    const color = colors[name ? name.length % colors.length : 0];
                    return ( <div key={i} className="member-avatar" title={name} style={{backgroundColor: color}}>{initials}</div> );
                })}
                {this.state.members.length > 3 && <div className="member-avatar overflow" title={`+${this.state.members.length - 3} más`}>+{this.state.members.length - 3}</div>}
            </div>
        );
    }
}

// === FILA GRID NORMAL ===
interface ITaskRowProps { 
    task: ITaskItem, allTasks: ITaskItem[], isCollapsed: boolean,
    onToggle: (id: string) => void, onOpen: (etn: string, id: string) => void, webAPI: ComponentFramework.WebApi,
    onDropAction: (draggedId: string, targetId: string) => void, onUnparentAction: (id: string) => void, onUpdateDep: (taskId: string, depId: string | null) => void
}
interface ITaskRowState { isDragOver: boolean, localDepId: string }
class TaskRow extends React.Component<ITaskRowProps, ITaskRowState> {
    constructor(props: ITaskRowProps) {
        super(props);
        this.state = { isDragOver: false, localDepId: props.task.depId || "" };
    }
    componentDidUpdate(prevProps: ITaskRowProps) {
        if (prevProps.task.depId !== this.props.task.depId) this.setState({ localDepId: this.props.task.depId || "" });
    }
    handleDragStart = (e: React.DragEvent) => { e.dataTransfer.setData("text/plain", this.props.task.id); e.dataTransfer.effectAllowed = "move"; };
    handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (!this.state.isDragOver) this.setState({ isDragOver: true }); };
    handleDragLeave = () => { this.setState({ isDragOver: false }); };
    handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); this.setState({ isDragOver: false });
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === this.props.task.id) return;
        if (this.props.task.parentId) { alert("⚠️ Acción Denegada: No aceptamos 'nietos'."); return; }
        if (this.props.allTasks.some(t => t.parentId === draggedId)) { alert("🛑 Acción Denegada: La tarea tiene subtareas."); return; }
        this.props.onDropAction(draggedId, this.props.task.id);
    };
    handleUnparentClick = (e: React.MouseEvent) => { e.stopPropagation(); this.props.onUnparentAction(this.props.task.id); };
    handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value; this.setState({ localDepId: val }); this.props.onUpdateDep(this.props.task.id, val === "" ? null : val);
    };
    render() {
        const { task, allTasks, isCollapsed, onToggle, onOpen, webAPI } = this.props;
        const isParent = Number.isInteger(task.virtualNro);
        const availableDependencies = allTasks.filter(candidate => candidate.id !== task.id && candidate.depId !== task.id);
        return (
            <div className={`grid-row ${isParent ? 'row-parent' : 'row-child'} ${this.state.isDragOver ? 'row-drag-over' : ''}`} draggable="true" onDragStart={this.handleDragStart} onDragOver={this.handleDragOver} onDragLeave={this.handleDragLeave} onDrop={this.handleDrop}>
                <div className="gd-cell w-nro" title="Orden Jerárquico">{task.virtualNro.toFixed(2)}</div>
                <div className="gd-cell w-id" title={task.idTarea}>{task.idTarea}</div>
                <div className="gd-cell w-name" title={task.nombre} style={{ paddingLeft: isParent ? '0px' : '20px' }}>
                    {isParent && <span className="toggle-btn" onClick={() => onToggle(task.id)}>{isCollapsed ? '▶' : '▼'}</span>}
                    {!isParent && <span className="child-indicator unbind-btn" onClick={this.handleUnparentClick} title="Desvincular">↳</span>}
                    <a className="link-name" onClick={() => onOpen(task.entityName, task.id)} style={{ fontWeight: isParent ? 'bold' : 'normal' }}>{task.nombre}</a>
                </div>
                <div className="gd-cell w-members"><MemberFacepile taskId={task.id} webAPI={webAPI} /></div>
                <div className="gd-cell w-date">{task.inicio}</div>
                <div className="gd-cell w-date">{task.fin}</div>
                <div className="gd-cell w-dep">
                    <select className="modern-select" value={this.state.localDepId} onChange={this.handleDepChange} title="Seleccionar Dependencia">
                        <option value="">--</option>
                        {availableDependencies.map(opt => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        {this.state.localDepId && !availableDependencies.find(x => x.id === this.state.localDepId) && ( <option value={this.state.localDepId} disabled>{task.depName || "(Oculta por ciclo)"}</option> )}
                    </select>
                </div>
                <div className="gd-cell w-num">{task.esfuerzo}</div>
                <div className="gd-cell w-num">{task.imputadas}</div>
                <div className="gd-cell w-prog" title={`Progreso: ${task.progreso}%`}>
                    <div className="prog-bar-container"><div className="prog-bar-fill" style={{ width: `${task.progreso}%` }}></div></div><span className="lbl-percent">{task.progreso}%</span>
                </div>
                <div className="gd-cell w-stat"><span className={`pill ${task.estado.toLowerCase().includes('completada') ? 's-done' : 's-pend'}`}>{task.estado}</span></div>
            </div>
        );
    }
}

// === COMPONENTES SEGUROS GANTT ===
class CustomGanttHeader extends React.Component<any> {
    render() {
        const { headerHeight, fontFamily, fontSize } = this.props;
        return (
            <div className="grid-header" style={{ height: headerHeight, fontFamily, fontSize, borderBottom: '1px solid #ccc' }}>
                <div className="gh-cell" style={{ flexGrow: 2, minWidth: '180px', paddingLeft: '10px' }}>NOMBRE</div>
                <div className="gh-cell w-members">EQUIPO</div> 
                <div className="gh-cell w-date">INICIO</div>
                <div className="gh-cell w-date">FIN</div>
            </div>
        );
    }
}

class CustomGanttTooltip extends React.Component<any> {
    render() {
        const { task, fontFamily, fontSize } = this.props;
        const formatGanttDate = (date: Date) => {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
        };
        return (
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily, fontSize, border: '1px solid #e0e0e0', minWidth: '150px', zIndex: 9999 }}>
                <div style={{ fontWeight: 600, color: '#323130', marginBottom: '8px', borderBottom: '1px solid #f3f2f1', paddingBottom: '4px' }}>{task.name}</div>
                <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>Inicio:</strong> {formatGanttDate(task.start)}</div>
                <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>Fin:</strong> {formatGanttDate(task.end)}</div>
                <div style={{ color: '#605e5c' }}><strong>Progreso:</strong> {task.progress}%</div>
            </div>
        );
    }
}

class CustomGanttTable extends React.Component<any, { dragOverId: string | null }> {
    constructor(props: any) { super(props); this.state = { dragOverId: null }; }
    render() {
        const { rowHeight, tasks: ganttViewTasks, fontFamily, fontSize } = this.props.ganttProps;
        const { tasks, webAPI, onOpenTask, onReparentTask, onUnparentTask } = this.props;
        const formatGanttDate = (date: Date) => {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
        };

        return (
            <div style={{ fontFamily, fontSize }}>
                {ganttViewTasks.map((t: GanttTask) => {
                    const originalTask = tasks.find((x: any) => x.id === t.id);
                    const isChild = originalTask ? !!originalTask.parentId : false;
                    const handleDragStart = (e: React.DragEvent) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; };
                    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (this.state.dragOverId !== t.id) this.setState({ dragOverId: t.id }); };
                    const handleDragLeave = () => { if (this.state.dragOverId === t.id) this.setState({ dragOverId: null }); };
                    const handleDrop = (e: React.DragEvent) => {
                        e.preventDefault(); this.setState({ dragOverId: null });
                        const draggedId = e.dataTransfer.getData("text/plain");
                        if (!draggedId || draggedId === t.id) return;
                        if (originalTask && originalTask.parentId) { alert("⚠️ Acción Denegada: No aceptamos 'nietos'."); return; }
                        if (tasks.some((x:any) => x.parentId === draggedId)) { alert("🛑 Acción Denegada: La tarea tiene subtareas."); return; }
                        onReparentTask(draggedId, t.id);
                    };
                    return (
                        <div className={`grid-row ${!isChild ? 'row-parent' : 'row-child'} ${this.state.dragOverId === t.id ? 'row-drag-over' : ''}`} style={{ height: rowHeight }} key={t.id} draggable="true" onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            <div className="gd-cell" style={{ flexGrow: 2, minWidth: '180px', paddingLeft: isChild ? '30px' : '10px', display: 'flex', alignItems: 'center' }} title={t.name}>
                                {isChild && <span className="child-indicator unbind-btn" onClick={(e) => { e.stopPropagation(); onUnparentTask(t.id); }} title="Desvincular">↳</span>}
                                <a className="link-name" onClick={() => { if(originalTask) onOpenTask(originalTask.entityName, originalTask.id) }} style={{ fontWeight: !isChild ? 'bold' : 'normal' }}>{t.name}</a>
                            </div>
                            <div className="gd-cell w-members"><MemberFacepile taskId={t.id} webAPI={webAPI} /></div>
                            <div className="gd-cell w-date">{formatGanttDate(t.start)}</div>
                            <div className="gd-cell w-date">{formatGanttDate(t.end)}</div>
                        </div>
                    );
                })}
            </div>
        );
    }
}

// === COMPONENTE PRINCIPAL ===
export class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {
    private GanttTableWrapper: React.FC<any>;

    constructor(props: IHelloWorldProps) {
        super(props);
        this.state = { 
            collapsedParents: [],
            activeView: 'grid',
            ganttViewMode: ViewMode.Day,
            hasError: false,
            errorMsg: ""
        };

        this.GanttTableWrapper = (ganttProps: any) => (
            <CustomGanttTable 
                ganttProps={ganttProps} tasks={this.props.tasks} webAPI={this.props.context.webAPI}
                onOpenTask={this.props.onOpenTask} onReparentTask={this.props.onReparentTask} onUnparentTask={this.props.onUnparentTask}
            />
        );
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ hasError: true, errorMsg: error.message });
        console.error("GANTT CRASH DETECTED:", error, errorInfo);
    }

    componentDidMount() { if (this.props.dependenciaFechas) this.syncParentDates(); }
    componentDidUpdate() { if (this.props.dependenciaFechas && !this.state.hasError) this.syncParentDates(); }

    private syncParentDates = () => {
        const { tasks, onUpdateDates } = this.props;
        const parents = tasks.filter(t => tasks.some(c => c.parentId === t.id));
        parents.forEach(p => {
            const computed = this.getComputedDates(p.id, tasks);
            if (computed) {
                const fmt = (d: Date | null) => {
                    if (!d) return null;
                    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                if (fmt(computed.start) !== fmt(p.rawInicio) || fmt(computed.end) !== fmt(p.rawFin)) {
                    onUpdateDates(p.id, computed.start, computed.end);
                }
            }
        });
    }
    
    private toggleParent = (id: string) => {
        this.setState(prevState => {
            const list = prevState.collapsedParents;
            return list.includes(id) ? { collapsedParents: list.filter(x => x !== id) } : { collapsedParents: [...list, id] };
        });
    }

    private handleExportExcel = () => {
        const { tasks } = this.props;
        if (!tasks || tasks.length === 0) { alert("No hay tareas para exportar."); return; }
        const headers = ["#", "ID Tarea", "Nombre", "Inicio", "Fin", "Dependencia", "Esfuerzo", "Imputadas", "Progreso", "Estado"];
        const rows = tasks.map(t => {
            const safeName = t.nombre ? `"${t.nombre.replace(/"/g, '""')}"` : "";
            const safeDep = t.depName ? `"${t.depName.replace(/"/g, '""')}"` : "";
            const safeState = t.estado ? `"${t.estado.replace(/"/g, '""')}"` : "";
            return [ t.virtualNro.toFixed(2), t.idTarea, safeName, t.inicio, t.fin, safeDep, t.esfuerzo, t.imputadas, `${t.progreso}%`, safeState ];
        });
        const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Tareas_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    }

    private getComputedDates = (taskId: string, allTasks: ITaskItem[]): { start: Date, end: Date } | null => {
        const children = allTasks.filter(c => c.parentId === taskId);
        if (children.length === 0) return null;
        let minStart = new Date(8640000000000000); let maxEnd = new Date(-8640000000000000); let hasValid = false;
        children.forEach(c => {
            const isParentItself = allTasks.some(grandChild => grandChild.parentId === c.id);
            let cStart: Date; let cEnd: Date;

            if (isParentItself && this.props.dependenciaFechas) {
                const childComputed = this.getComputedDates(c.id, allTasks);
                if (childComputed) { cStart = childComputed.start; cEnd = childComputed.end; } 
                else {
                    cStart = c.rawInicio ? new Date(c.rawInicio) : new Date(); if (isNaN(cStart.getTime())) cStart = new Date();
                    cEnd = c.rawFin ? new Date(c.rawFin) : new Date(cStart.getTime() + 24 * 60 * 60 * 1000); if (isNaN(cEnd.getTime())) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
                }
            } else {
                cStart = c.rawInicio ? new Date(c.rawInicio) : new Date(); if (isNaN(cStart.getTime())) cStart = new Date();
                cEnd = c.rawFin ? new Date(c.rawFin) : new Date(cStart.getTime() + 24 * 60 * 60 * 1000); if (isNaN(cEnd.getTime())) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
            }
            if (cEnd.getTime() <= cStart.getTime()) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);

            if (cStart < minStart) minStart = cStart;
            if (cEnd > maxEnd) maxEnd = cEnd;
            hasValid = true;
        });
        return hasValid ? { start: minStart, end: maxEnd } : null;
    };

    public render(): React.ReactNode {
        const { tasks, dependenciaFechas } = this.props;
        const { activeView, ganttViewMode } = this.state;

        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#a4262c', backgroundColor: '#fde7e9', height: '100%', fontFamily: 'Segoe UI' }}>
                    <h3 style={{ marginTop: 0 }}>Aviso de Seguridad</h3>
                    <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>Se ha evitado el cuelgue de la vista. Error reportado: <br/><br/><b>{this.state.errorMsg}</b></p>
                    <button className="btn-new" onClick={() => this.setState({ hasError: false, activeView: 'grid' })}>Volver a la Lista</button>
                </div>
            );
        }

        const visibleTasks = tasks.filter(t => !t.parentId || !this.state.collapsedParents.includes(t.parentId));
        const visibleIds = visibleTasks.map(vt => vt.id);

        let ganttTasks: GanttTask[] = [];
        if (activeView === 'gantt' && visibleTasks.length > 0) {
            ganttTasks = visibleTasks.map(t => {
                let start = t.rawInicio ? new Date(t.rawInicio) : new Date();
                if (isNaN(start.getTime())) start = new Date();
                start.setHours(0, 0, 0, 0); 
                
                let end = t.rawFin ? new Date(t.rawFin) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
                if (isNaN(end.getTime())) end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                end.setHours(23, 59, 59, 999); 
                
                if (end.getTime() <= start.getTime()) {
                    end = new Date(start.getTime()); end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 999);
                }

                const hasVisibleChildren = visibleTasks.some(child => child.parentId === t.id); 
                const itemType = hasVisibleChildren ? 'project' : 'task';

                if (hasVisibleChildren && dependenciaFechas) {
                    const computed = this.getComputedDates(t.id, tasks);
                    if (computed) { start = computed.start; end = computed.end; }
                }

                const validProject = (t.parentId && visibleIds.includes(t.parentId)) ? t.parentId : undefined;
                const validDep = (t.depId && visibleIds.includes(t.depId)) ? [t.depId] : undefined;

                let progColor = '#031F30'; let progSelColor = '#021520'; let bgColor = '#b5c8d6'; let bgSelColor = '#94aabf';
                if (hasVisibleChildren) {
                    progColor = '#42638C'; progSelColor = '#2b4463'; bgColor = '#c7d1dc'; bgSelColor = '#a8b8ca';
                } else if (t.parentId) {
                    progColor = '#55419E'; progSelColor = '#3b2c6e'; bgColor = '#dcd9eb'; bgSelColor = '#c2bcde';
                }

                return {
                    start: start, end: end, name: t.nombre || "Sin nombre", id: t.id, type: itemType, progress: t.progreso || 0, isDisabled: false,
                    project: validProject, dependencies: validDep,
                    styles: { progressColor: progColor, progressSelectedColor: progSelColor, backgroundColor: bgColor, backgroundSelectedColor: bgSelColor }
                };
            });
        }

        return (
            <div className="pcf-container">
                <div className="v-tag">v{this.props.version}</div>
                
                <div className="header-actions">
                    <button className="btn-new" onClick={this.props.onCreateTask}>+ Crear Tarea</button>
                    <button className="btn-excel" onClick={this.handleExportExcel} title="Descargar CSV">📊 Excel</button>
                    <span style={{fontSize:'10px', marginLeft:'10px', color:'#666'}}>💡 Arrastra para agrupar. Click en ↳ para desagrupar.</span>
                    
                    <div className="view-toggle-container">
                        <button className={`btn-view ${activeView === 'grid' ? 'active' : ''}`} onClick={() => this.setState({ activeView: 'grid' })}>Lista</button>
                        <button className={`btn-view ${activeView === 'gantt' ? 'active' : ''}`} onClick={() => this.setState({ activeView: 'gantt' })}>Gantt</button>
                    </div>

                    {activeView === 'gantt' && (
                        <div className="zoom-toggle-container">
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Day ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Day })}>Días</button>
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Week ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Week })}>Semanas</button>
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Month ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Month })}>Meses</button>
                        </div>
                    )}
                </div>
                
                {activeView === 'grid' && (
                    <>
                        <div className="grid-header">
                            <div className="gh-cell w-nro">#</div><div className="gh-cell w-id">ID</div><div className="gh-cell w-name">NOMBRE</div><div className="gh-cell w-members">EQUIPO</div>
                            <div className="gh-cell w-date">INICIO</div><div className="gh-cell w-date">FIN</div><div className="gh-cell w-dep">DEPENDENCIA</div><div className="gh-cell w-num">ESFUERZO</div>
                            <div className="gh-cell w-num">IMPUTADAS</div><div className="gh-cell w-prog">PROGRESO</div><div className="gh-cell w-stat">ESTADO</div>
                        </div>
                        <div className="grid-body">
                            {visibleTasks.map((task) => (
                                <TaskRow key={task.id} task={task} allTasks={this.props.tasks} isCollapsed={this.state.collapsedParents.includes(task.id)} onToggle={this.toggleParent}
                                    onOpen={this.props.onOpenTask} webAPI={this.props.context.webAPI} onDropAction={this.props.onReparentTask} onUnparentAction={this.props.onUnparentTask} onUpdateDep={this.props.onUpdateDependency}
                                />
                            ))}
                        </div>
                    </>
                )}

                {activeView === 'gantt' && (
                    <div className="gantt-container">
                        {ganttTasks.length > 0 ? (
                            <Gantt
                                tasks={ganttTasks} viewMode={ganttViewMode}
                                onDateChange={(task: GanttTask) => this.props.onUpdateDates(task.id, task.start, task.end)}
                                onProgressChange={(task: GanttTask) => this.props.onUpdateProgreso(task.id, task.progress)}
                                onDoubleClick={(task: GanttTask) => { const og = this.props.tasks.find(t => t.id === task.id); if (og) this.props.onOpenTask(og.entityName, og.id); }}
                                rowHeight={28} listCellWidth="480px" columnWidth={60} locale="es" fontFamily="'Segoe UI', sans-serif" fontSize="12px" arrowColor="#d13438" 
                                TaskListHeader={CustomGanttHeader} TaskListTable={this.GanttTableWrapper} TooltipContent={CustomGanttTooltip}
                            />
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No hay datos de fechas válidas para mostrar en el Gantt.</div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}