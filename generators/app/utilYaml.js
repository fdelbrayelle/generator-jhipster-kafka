/**
 * Copyright 2013-2017 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see http://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const jsyaml = require('js-yaml');
const _ = require('lodash');

module.exports = {
    // array
    getPropertyInArray,
    updatePropertyInArray,
    deletePropertyInArray,
    // yaml read
    getYamlProperty,
    // yaml properties
    addYamlPropertiesAtBeginin,
    addYamlPropertiesAtEnd,
    addYamlPropertiesBeforeAnotherProperty,
    addYamlPropertiesAfterAnotherProperty,
    addYamlPropertiesAtLineIndex,
    // yaml property
    addYamlPropertyAtBeginin,
    addYamlPropertyAtEnd,
    addYamlPropertyBeforeAnotherProperty,
    addYamlPropertyAfterAnotherProperty,
    addYamlPropertyAtLineIndex,
    // functions
    getLastPropertyCommonHierarchy,
    getPathAndValueOfAllProperty,
    // main
    updateYamlProperties,
    updateYamlProperty
};

/**
 * get a property by path in a array
 * TODO move to main generator ?
 *
 * @param {array} array - array in which we want to search
 * @param {string} name - property name to search "format myProperty.level2.level3"
 * @param {string} generator - The generator
 * @return {string} the value of property or undefined
 */
function getPropertyInArray(array, name, generator) {
    return _.get(array, name);
}

/**
 * Update or create a property by path in a array
 * TODO move to main generator ?
 * @param {array} array - array in which we want to update
 * @param {string} name - property name to search "format myProperty.level2.level3"
 * @param {string} generator - The generator
 * @param {string} value - (optional) value of the property
 */
function updatePropertyInArray(array, name, generator, value) {
    _.set(array, name, value);
}

/**
 * Delete a property by path in a array
 * TODO move to main generator ?
 * @param {array} array - array in which we want to delete
 * @param {string} name - property name to search "format myProperty.level2.level3"
 * @param {string} generator - The generator
 */
function deletePropertyInArray(array, name, generator) {
    _.unset(array, name);
}

/**
 * Get a yaml property by path in a file
 * TODO move to main generator ?
 *
 * @param {string} file - yaml file to search
 * @param {string} name - property name to search "format myProperty.level2.level3"
 * @param {string} generator - The generator
 * @return {string} the value of property or undefined
 */
function getYamlProperty(file, name, generator) {
    const treeData = jsyaml.safeLoad(generator.fs.read(file));
    return getPropertyInArray(treeData, name.toString().split('.'), generator);
}

/**
 * Add yaml properties at beginin
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - array of property to add
 * @param {string} generator - The generator
 */
function addYamlPropertiesAtBeginin(file, properties, generator) {
    const bodyLines = generator.fs.read(file).split('\n');
    const newLines = jsyaml.safeDump(properties, { indent: 4 }).split('\n');
    bodyLines.splice(bodyLines.count, 0, newLines.join('\n'));
    generator.fs.write(file, bodyLines.join('\n'));
}

/**
 * Add yaml properties at end
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - array of property to add
 * @param {string} generator - The generator
 */
function addYamlPropertiesAtEnd(file, properties, generator) {
    const bodyLines = generator.fs.read(file).split('\n');
    const newLines = jsyaml.safeDump(properties, { indent: 4 }).split('\n');
    generator.fs.write(file, bodyLines.concat(newLines).join('\n'));
}

/**
 * Add yaml properties before another property
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - array of property to add
 * @param {string} generator - The generator
 * @param {string} propertyBefore - The property before which we wish to insert new properties
 * @param {string} addBeforeComment - (Optional) if this variable is defined, means that we will return the index before the previuous comment of the property.
 */
function addYamlPropertiesBeforeAnotherProperty(file, properties, generator, propertyBefore, addBeforeComment) {
    const body = generator.fs.read(file);
    const newLines = jsyaml.safeDump(properties, { indent: 4 }).split('\n');
    const applicationPropertyIndex = getIndexBeforeLineOfProperty(body, propertyBefore, generator, addBeforeComment);
    if (applicationPropertyIndex === -1) {
        throw new Error(`Property ${propertyBefore} not found`); // inside callback
    }
    const bodyLines = body.split('\n');
    bodyLines.splice(applicationPropertyIndex, 0, newLines.join('\n'));
    generator.fs.write(file, bodyLines.join('\n'));
}

/**
 * Add yaml properties after another property
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - array of property to add
 * @param {string} generator - The generator
 * @param {string} propertyAfter - The property after which we wish to insert new properties
 */
function addYamlPropertiesAfterAnotherProperty(file, properties, generator, propertyAfter) {
    const body = generator.fs.read(file);
    const newLines = jsyaml.safeDump(properties, { indent: 4 }).split('\n');
    const applicationPropertyIndex = getIndexAfterLineOfProperty(file, propertyAfter, generator);
    if (applicationPropertyIndex === -1) {
        throw new Error(`Property ${propertyAfter} not found`); // inside callback
    }
    const bodyLines = body.split('\n');
    bodyLines.splice(applicationPropertyIndex, 0, newLines.join('\n'));
    generator.fs.write(file, bodyLines.join('\n'));
}

/**
 * Add yaml properties at a specific line
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - array of property to add
 * @param {string} generator - The generator
 * @param {string} indexLine - Index of line which we wish to insert new properties
 * @param {string} numberSpace - number espace to start
 */
function addYamlPropertiesAtLineIndex(file, properties, generator, indexLine, numberSpace) {
    const body = generator.fs.read(file);
    const newLines = jsyaml.safeDump(properties, { indent: 4 }).split('\n');
    const bodyLines = body.split('\n');
    let spaceStr = '';
    for (let i = 0; i < numberSpace; i++) {
        spaceStr += ' ';
    }
    bodyLines.splice(indexLine, 0, newLines.map(line => spaceStr + line).join('\n'));
    generator.fs.write(file, bodyLines.join('\n'));
}

/**
 * Add a yaml property at beginin
 * TODO manage value of array type
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name format spring.cloud.name
 * @param {string | integer } value - value of the property
 * @param {string} generator - The generator
 */
function addYamlPropertyAtBeginin(file, property, value, generator) {
    const properties = {};
    updatePropertyInArray(properties, property, generator, value);
    addYamlPropertiesAtBeginin(file, properties, generator);
}

/**
 * Add a yaml property at end
 * TODO manage value of array type
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name
 * @param {string | integer } value - value of the property
 * @param {string} generator - The generator
 */
function addYamlPropertyAtEnd(file, property, value, generator) {
    const properties = {};
    updatePropertyInArray(properties, property, generator, value);
    addYamlPropertiesAtEnd(file, properties, generator);
}

/**
 * Add a yaml property before another property
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name
 * @param {string} value - value of property
 * @param {string} generator - The generator
 * @param {string} propertyBefore - The property before which we wish to insert new property
 * @param {string} addBeforeComment - (Optional) if this variable is defined, means that we will return the index before the previuous comment of the property.
 */
function addYamlPropertyBeforeAnotherProperty(file, property, value, generator, propertyBefore, addBeforeComment) {
    const properties = {};
    updatePropertyInArray(properties, property, generator, value);
    addYamlPropertiesBeforeAnotherProperty(file, properties, generator, propertyBefore, addBeforeComment);
}

/**
 * Add a yaml property after another property
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name
 * @param {string} value - value of property
 * @param {string} generator - The generator
 * @param {string} propertyAfter - The property before which we wish to insert new property
 */
function addYamlPropertyAfterAnotherProperty(file, property, value, generator, propertyAfter) {
    const properties = {};
    updatePropertyInArray(properties, property, generator, value);
    addYamlPropertiesAfterAnotherProperty(file, properties, generator, propertyAfter);
}

/**
 * Add yaml properties at a specific line
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name
 * @param {string} value - value of property
 * @param {string} generator - The generator
 * @param {string} indexLine - Index of line which we wish to insert new properties
 * @param {string} numberSpace - number espace to start
 */
function addYamlPropertyAtLineIndex(file, property, value, generator, indexLine, numberSpace) {
    const properties = {};
    updatePropertyInArray(properties, property, generator, value);
    addYamlPropertiesAtLineIndex(file, properties, generator, indexLine, numberSpace);
}

/**
 * Get the last property of a common hierarchical.
 *
 * @param {string} file - file where we want to search
 * @param {string} property - property name to remove
 * @param {string} generator - The generator
 * @return {string} String path property
 */
function getLastPropertyCommonHierarchy(file, property, generator) {
    const yamlData = jsyaml.safeLoad(generator.fs.read(file));
    const pathYaml = [];
    getPathAndValueOfAllProperty(yamlData, '', pathYaml, generator);
    let idxPropTmp = property.lastIndexOf('.');
    let strPropTmp;
    strPropTmp = property;
    let lastValideParentProperty = getYamlProperty(file, strPropTmp, generator) ? strPropTmp : undefined;
    while (idxPropTmp !== -1) {
        if (getYamlProperty(file, strPropTmp, generator) !== undefined) {
            lastValideParentProperty = strPropTmp;
            idxPropTmp = -1;
        } else {
            idxPropTmp = strPropTmp.lastIndexOf('.');
            if (idxPropTmp !== -1) {
                strPropTmp = strPropTmp.substring(0, idxPropTmp);
            }
        }
    }
    return lastValideParentProperty;
}

/**
 * Retourne l'index de la ligne d'une propriété simple et unique
 *
 * @param {string} body - String body to search
 * @param {string} property - property name to search
 * @param {string} generator - The generator
 * @param {boolean} addBeforeComment - if this variable is true, means that we will return the index before the previuous comment of the property.
 */
function getIndexBeforeLineOfProperty(body, property, generator, addBeforeComment) {
    try {
        const lines = body.split('\n');

        let otherwiseLineIndex = -1;
        lines.some((line, i) => {
            if (line.indexOf('#') === -1 && line.indexOf(`${property}:`) !== -1) {
                otherwiseLineIndex = i;
                return true;
            }
            return false;
        });

        if (addBeforeComment === true) {
            for (let i = otherwiseLineIndex - 1; i > 0; i--) {
                if (lines[i].indexOf('#') !== -1 || /^\s*$/.test(lines[i])) {
                    otherwiseLineIndex = i;
                } else {
                    break;
                }
            }
            otherwiseLineIndex += 1;
        }
        return otherwiseLineIndex;
    } catch (e) {
        return -1;
    }
}

/**
 * Array of line of yaml file has a property ?
 *
 * @param {array} array - String body to search
 * @param {string} property - property name to search
 * @param {int} fromIdx - start search from
 * @param {string} generator - The generator
 */
function hasProperty(array, property, fromIdx, generator) {
    let returnIndex = -1;
    if (fromIdx === -1) {
        fromIdx = 0;
    }
    for (let i = fromIdx; i < array.length; i++) {
        const line = array[i];

        if (
            line.indexOf(`${property}:`) !== -1 &&
            (line.indexOf('#') === -1 || (line.indexOf('#') !== -1 && line.indexOf('#') > line.indexOf(`${property}:`)))
        ) {
            returnIndex = i;
            break;
        }
    }
    return returnIndex;
}

/**
 * get index of line of property
 *
 * @param {string} file - String body to search
 * @param {string} property - property name to search
 * @param {string} generator - The generator
 * @param {string} ignorecur - (Optional) If define, return the index at the end all the properties child of the property.
 * If not define, return the index at the end all the properties of the parent property.
 */
function getIndexAfterLineOfProperty(file, property, generator, ignorecur) {
    const body = generator.fs.read(file);
    const lines = body.split('\n');
    let otherwiseLineIndex = -1;
    let curr;

    const namePath = property.split('.');

    curr = namePath.splice(0, 1);

    while (curr !== undefined) {
        otherwiseLineIndex = hasProperty(lines, curr, otherwiseLineIndex, generator);
        curr = namePath.splice(0, 1)[0];
    }

    if (otherwiseLineIndex === -1) {
        return otherwiseLineIndex;
    }
    if (ignorecur) {
        otherwiseLineIndex += 1;
    }

    let spaces = 0;
    while (lines[otherwiseLineIndex].charAt(spaces) === ' ') {
        spaces += 1;
    }
    let spacesNext = 0;
    for (let i = otherwiseLineIndex + 1; i < lines.length; i++) {
        // line  by comments
        if (lines[i].trim().indexOf('#') !== 0) {
            spacesNext = 0;
            while (lines[i].charAt(spacesNext) === ' ') {
                spacesNext += 1;
            }
            // if next line has same number of space or more than the property, then it's a new property
            if (spacesNext >= spaces && spacesNext !== 0) {
                otherwiseLineIndex = i;
            } else {
                break;
            }
        }
    }

    return otherwiseLineIndex + 1;
}

/**
 * Update arrayReturn with full path of all property of object and the value associate at this property.
 * @param {object} obj
 * @param {string} stack path
 * @param {array} arrayReturn
 * @param {object} generator
 * @returns {array} return the array.
 */
function getPathAndValueOfAllProperty(obj, stack, arrayReturn, generator) {
    if (obj !== undefined && obj !== null) {
        for (let i = 0; i < Object.keys(obj).length; i++) {
            const property = Object.keys(obj)[i];
            if (typeof obj[property] === 'object') {
                if (stack === '') {
                    getPathAndValueOfAllProperty(obj[property], `${property}`, arrayReturn, generator);
                } else {
                    getPathAndValueOfAllProperty(obj[property], `${stack}.${property}`, arrayReturn, generator);
                }
            } else if (stack === '') {
                const key = `${property}`;
                const keyValue = [];
                keyValue.path = key;
                keyValue.value = obj[property];
                arrayReturn.push(keyValue);
            } else {
                const key = `${stack}.${property}`;
                const keyValue = [];
                keyValue.path = key;
                keyValue.value = obj[property];
                arrayReturn.push(keyValue);
            }
        }
    } else {
        const key = `${stack}`;
        const keyValue = [];
        keyValue.path = key;
        keyValue.value = obj;
        arrayReturn.push(keyValue);
    }
    return arrayReturn;
}

/**
 * Rewrite a yaml file.
 * TODO move to main generator ?
 * TODO manage value of array type
 *
 * @param {string} file - yaml file to update
 * @param {string} property - property name format spring.cloud.name
 * @param {string | integer } value - value of the property
 * @param {string} generator - The generator
 */
function updateYamlProperty(file, property, value, generator) {
    try {
        if (getYamlProperty(file, property, generator) !== undefined) {
            generator.log(`Update Property ${property} in file ${file} not implemented yet\n Skip !`);
            // update
            // TODO code Update
        } else {
            const propExist = getLastPropertyCommonHierarchy(file, property, generator);
            if (propExist === undefined) {
                addYamlPropertyAtEnd(file, property, value, generator);
                return;
            }
            const arrPropExist = propExist.split('.');
            const spaces = arrPropExist.length * 4;
            const indexLineProps = getIndexAfterLineOfProperty(file, propExist, generator, true);
            addYamlPropertyAtLineIndex(file, property.substring(propExist.length + 1), value, generator, indexLineProps, spaces);
        }
    } catch (e) {
        generator.log(e);
    }
}

/**
 * Rewrite a yaml file.
 * TODO move to main generator ?
 * TODO manage case where properties have different parents
 *
 * @param {string} file - yaml file to update
 * @param {array} properties - properties to add to yaml file
 * @param {string} generator - The generator
 */
function updateYamlProperties(file, properties, generator) {
    try {
        const arrayProp = [];
        getPathAndValueOfAllProperty(properties, '', arrayProp, generator);
        for (let i = 0; i < arrayProp.length; i++) {
            updateYamlProperty(file, arrayProp[i].path, arrayProp[i].value, generator);
        }
    } catch (e) {
        generator.log(e);
    }
}
