import * as React from 'react';

export interface ITaskItem {
    id: string; originalId?: string; idTarea: string; nombre: string; inicio: string;
    fin: string; esfuerzo: string; imputadas: string; progreso: number; 
    estado: string; parentId?: string; parentName?: string; entityName: string;
    virtualNro: number; 
}

export interface IHelloWorldProps { 
    tasks: ITaskItem[]; 
    version: string;
    onOpenTask: (etn: string, id: string) => void;
    onCreateTask: () => void;
    onUpdateProgreso: (id: string, val: number) => void;
}

interface IHelloWorldState {
    collapsedParents: string[];
}

const TaskRow = (props: { 
    task: ITaskItem, 
    isCollapsed: boolean,
    onToggle: (id: string) => void,
    onOpen: (etn: string, id: string) => void
}) => {
    const { task, isCollapsed, onToggle, onOpen } = props;
    const isParent = Number.isInteger(task.virtualNro);

    return (
        <div className={`grid-row ${isParent ? 'row-parent' : 'row-child'}`}>
            <div className="gd-cell w-nro">{task.virtualNro.toFixed(2)}</div>
            <div className="gd-cell w-id" title={task.id}>{task.idTarea}</div>
            
            <div className="gd-cell w-name" style={{ paddingLeft: isParent ? '0px' : '20px' }}>
                {isParent && (
                    <span className="toggle-btn" onClick={() => onToggle(task.id)}>
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                )}
                {!isParent && <span className="child-indicator">↳</span>}
                <a className="link-name" onClick={() => onOpen(task.entityName, task.id)} 
                   style={{ fontWeight: isParent ? 'bold' : 'normal' }}>
                   {task.nombre}
                </a>
            </div>

            {/* Nueva Columna Dependencia */}
            <div className="gd-cell w-dep" title={task.parentName}>{task.parentName}</div>

            <div className="gd-cell w-date">{task.inicio}</div>
            <div className="gd-cell w-date">{task.fin}</div>
            <div className="gd-cell w-num">{task.esfuerzo}</div>
            <div className="gd-cell w-num">{task.imputadas}</div>
            
            <div className="gd-cell w-prog">
                {/* Barra de Progreso Solo Lectura */}
                <div className="prog-bar-container">
                    <div className="prog-bar-fill" style={{ width: `${task.progreso}%` }}></div>
                </div>
                <span className="lbl-percent">{task.progreso}%</span>
            </div>

            <div className="gd-cell w-stat">
                <span className={`pill ${task.estado.toLowerCase().includes('completada') ? 's-done' : 's-pend'}`}>
                    {task.estado}
                </span>
            </div>
        </div>
    );
};

export class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {
    constructor(props: IHelloWorldProps) {
        super(props);
        this.state = { collapsedParents: [] };
    }

    private toggleParent = (id: string) => {
        this.setState(prevState => {
            const list = prevState.collapsedParents;
            return list.includes(id) ? { collapsedParents: list.filter(x => x !== id) } : { collapsedParents: [...list, id] };
        });
    }

    public render(): React.ReactNode {
        const visibleTasks = this.props.tasks.filter(t => {
            if (!t.parentId) return true;
            return !this.state.collapsedParents.includes(t.parentId);
        });

        return (
            <div className="pcf-container">
                <div className="v-tag">v{this.props.version}</div>
                
                <div className="header-actions">
                    <button className="btn-new" onClick={this.props.onCreateTask}>+ Crear Tarea</button>
                </div>
                
                <div className="grid-header">
                    <div className="gh-cell w-nro">#</div>
                    <div className="gh-cell w-id">ID</div>
                    <div className="gh-cell w-name">NOMBRE</div>
                    <div className="gh-cell w-dep">DEPENDENCIA</div>
                    <div className="gh-cell w-date">INICIO</div>
                    <div className="gh-cell w-date">FIN</div>
                    <div className="gh-cell w-num">ESFUERZO ESTIMADO</div>
                    <div className="gh-cell w-num">HORAS IMPUTADAS</div>
                    <div className="gh-cell w-prog">PROGRESO</div>
                    <div className="gh-cell w-stat">ESTADO</div>
                </div>

                <div className="grid-body">
                    {visibleTasks.map((task) => (
                        <TaskRow key={task.id} task={task} 
                            isCollapsed={this.state.collapsedParents.includes(task.id)}
                            onToggle={this.toggleParent}
                            onOpen={this.props.onOpenTask} 
                        />
                    ))}
                </div>
            </div>
        );
    }
}