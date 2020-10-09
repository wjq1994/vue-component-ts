let instances: any = {};

export class PopupManager {
    public static zIndex: number = 0;

    public static nextZIndex() {
        return PopupManager.zIndex++;
    }

}

