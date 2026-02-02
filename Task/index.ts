/* eslint-disable */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { HelloWorld, IHelloWorldProps, ITaskItem } from "./HelloWorld";
import * as React from "react";

export class Task implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    public init(): void {}

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const ds = context.parameters.sampleDataSet;
        
        let rawItems: ITaskItem[] = (ds.sortedRecordIds || []).map((id) => {
            const record = ds.records[id] as any;
            
            // Extracción de Padre
            const rawParent = record.getValue("sec_tareaprincipalid");
            let cleanParentId: string | undefined = undefined;
            let parentName: string = "";

            if (rawParent) {
                if (Array.isArray(rawParent) && rawParent.length > 0) {
                    cleanParentId = rawParent[0].id; 
                    parentName = rawParent[0].name;
                } else if (typeof rawParent === 'object') {
                     if (rawParent.id && rawParent.id.guid) cleanParentId = rawParent.id.guid;
                     else if (rawParent.id && typeof rawParent.id === 'string') cleanParentId = rawParent.id;
                     if (rawParent.name) parentName = rawParent.name;
                }
            }
            if (cleanParentId) cleanParentId = cleanParentId.replace(/[{}]/g, '').toLowerCase();

            return {
                id: id.replace(/[{}]/g, '').toLowerCase(), 
                originalId: id, // Necesitamos el ID original con llaves para el FetchXML a veces, o limpio, probaremos limpio
                idTarea: record.getFormattedValue("sec_idtarea"),
                nombre: record.getFormattedValue("sec_name"),
                inicio: record.getFormattedValue("sec_inicio"),
                fin: record.getFormattedValue("sec_fin"),
                esfuerzo: record.getFormattedValue("sec_esfuerzoestimado"),
                imputadas: record.getFormattedValue("sec_horasimputadas"),
                progreso: parseInt(record.getFormattedValue("sec_progreso")) || 0,
                estado: record.getFormattedValue("statuscode"),
                parentId: cleanParentId,
                parentName: parentName,
                entityName: record.getNamedReference().entityType,
                virtualNro: 0
            };
        });

        // Algoritmo de Ordenación
        const parents = rawItems.filter(x => !x.parentId);
        const children = rawItems.filter(x => x.parentId);
        parents.forEach((parent, index) => { parent.virtualNro = index + 1; });
        parents.forEach(parent => {
            const myChildren = children.filter(c => c.parentId === parent.id);
            myChildren.forEach((child, idx) => { child.virtualNro = parent.virtualNro + ((idx + 1) / 100); });
        });
        children.forEach(child => { if (child.virtualNro === 0) child.virtualNro = 9999; });

        const sortedItems = [...parents, ...children].sort((a, b) => a.virtualNro - b.virtualNro);

        const props: IHelloWorldProps = { 
            tasks: sortedItems, 
            version: "1.5.6",
            context: context, // Pasamos el contexto completo para la WebAPI
            onOpenTask: (etn, id) => {
                void context.navigation.openForm({ entityName: etn, entityId: id }, { target: "2", width: "800", height: "600" });
            },
            onCreateTask: () => {
                const pageContext = context.mode as any;
                const formParams: any = {};
                if (pageContext.contextInfo?.entityId) {
                    formParams["sec_proyectoid"] = [{ 
                        id: pageContext.contextInfo.entityId, 
                        entityType: pageContext.contextInfo.entityTypeName, 
                        name: pageContext.contextInfo.entityRecordName 
                    }];
                }
                void context.navigation.openForm({ entityName: "sec_tarea", useQuickCreateForm: true }, formParams);
            },
            onUpdateProgreso: (id, val) => { }
        };
        
        return React.createElement(HelloWorld, props);
    }

    public getOutputs(): IOutputs { return {}; }
    public destroy(): void {}
}