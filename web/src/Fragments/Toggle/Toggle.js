import './Toggle.css';

export default function Toggle({
    selected,
    onClick,
    id,
    disabled
}) {
    return <div className="toggle pointer" onClick={() => {
        if(!disabled) {
            onClick(id);
        }
    }}>
        <div className={'inner'+ (selected ? ' active-toggle' : '')}></div>
    </div>
}